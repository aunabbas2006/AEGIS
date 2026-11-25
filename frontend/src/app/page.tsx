import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { ScoringPlayground } from "@/components/landing/ScoringPlayground";
import { WhyAegis } from "@/components/landing/WhyAegis";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <ScoringPlayground />
        <WhyAegis />
      </main>
      <Footer />
    </>
  );
}
