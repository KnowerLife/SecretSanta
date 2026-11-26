import {
  AudienceSection,
  CtaSection,
  FaqSection,
  FeaturesSection,
  GuideSection,
  HeroSection,
  IdeasSection,
  ModesSection,
  PrivacySection,
  RulesSection,
  StepsSection,
  TestimonialsSection,
} from '../widgets/MarketingSections.tsx';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <ModesSection />
      <StepsSection />
      <FeaturesSection />
      <PrivacySection />
      <RulesSection />
      <AudienceSection />
      <IdeasSection />
      <GuideSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
