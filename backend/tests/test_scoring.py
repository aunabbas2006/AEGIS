from app.models import Reachability, Severity
from app.scoring import priority_score, urgency


def test_overdue_beats_far_future():
    assert urgency(-5) > urgency(3) > urgency(90) > 1.0


def test_unreachable_cve_is_down_ranked():
    reachable = priority_score(Severity.CRITICAL, None, Reachability.REACHABLE, is_public=False)
    declared = priority_score(Severity.CRITICAL, None, Reachability.DECLARED_ONLY, is_public=False)
    assert declared < reachable / 5


def test_urgent_medium_outranks_distant_high():
    soon = priority_score(Severity.MEDIUM, 3, None, is_public=False)
    later = priority_score(Severity.HIGH, 120, None, is_public=False)
    assert soon > later


def test_score_is_bounded():
    assert priority_score(Severity.CRITICAL, -1, Reachability.REACHABLE, is_public=True) == 100.0
    assert priority_score(Severity.INFO, 400, Reachability.DECLARED_ONLY, is_public=False) > 0
