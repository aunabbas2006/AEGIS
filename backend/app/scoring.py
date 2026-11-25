"""The prioritization engine — the heart of AEGIS (§7 of the plan).

    priority = severity_weight × urgency(days_remaining) × reachability_factor × exposure

Every scanner emits findings of a different shape; this module collapses them into
one comparable 0–100 score so the dashboard can show a single ranked queue.
"""

import math
from datetime import date

from app.models import Reachability, Severity

SEVERITY_WEIGHT: dict[Severity, float] = {
    Severity.CRITICAL: 10.0,
    Severity.HIGH: 7.0,
    Severity.MEDIUM: 4.0,
    Severity.LOW: 2.0,
    Severity.INFO: 1.0,
}

REACHABILITY_FACTOR: dict[Reachability, float] = {
    Reachability.REACHABLE: 1.0,
    Reachability.IMPORTED_NOT_CALLED: 0.4,
    Reachability.DECLARED_ONLY: 0.1,
}

OVERDUE_URGENCY = 3.0
NO_DEADLINE_URGENCY = 1.5
URGENCY_HALF_LIFE_DAYS = 30
PUBLIC_EXPOSURE = 1.25

_MAX_RAW = SEVERITY_WEIGHT[Severity.CRITICAL] * OVERDUE_URGENCY * PUBLIC_EXPOSURE


def days_remaining(due: date | None, today: date | None = None) -> int | None:
    if due is None:
        return None
    return (due - (today or date.today())).days


def urgency(days: int | None) -> float:
    """Decay curve: due in 3 days ≈ 2.8×, due in 90 days ≈ 1.1×, overdue = 3×."""
    if days is None:
        return NO_DEADLINE_URGENCY
    if days <= 0:
        return OVERDUE_URGENCY
    return 1.0 + 2.0 * math.exp(-days / URGENCY_HALF_LIFE_DAYS)


def priority_score(
    severity: Severity,
    days: int | None,
    reachability: Reachability | None,
    is_public: bool,
) -> float:
    raw = (
        SEVERITY_WEIGHT[severity]
        * urgency(days)
        * (REACHABILITY_FACTOR[reachability] if reachability else 1.0)
        * (PUBLIC_EXPOSURE if is_public else 1.0)
    )
    return round(min(100.0, raw / _MAX_RAW * 100), 1)
