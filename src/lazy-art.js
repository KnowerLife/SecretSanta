import { $$ } from './utils.js?v=67';

// Ленивая загрузка декоративных фонов через IntersectionObserver.
const ART_IMAGES = {
  'art-audience': 'assets/images/audience-remote.jpg',
  'art-ideas': 'assets/images/gift-ideas.jpg',
  'art-chat': 'assets/images/feature-anonymous-chat.jpg',
  'art-privacy': 'assets/images/privacy-who-sees.jpg',
  'art-rules': 'assets/images/rules-fair-draw.jpg',
  'art-testimonials': 'assets/images/testimonials-friends.jpg',
  'art-faq': 'assets/images/faq-help.jpg',
  'art-create': 'assets/images/create-game-head.jpg',
  'art-join': 'assets/images/join-game-head.jpg',
  'art-quick': 'assets/images/quick-draw-head.jpg',
  'cta-card--art': 'assets/images/cta-celebration.jpg',
};

function initLazyArt() {
  const targets = [];
  $$('.section-head--art, .cta-card--art').forEach(el => {
    const key = Object.keys(ART_IMAGES).find(cls => el.classList.contains(cls));
    if (key) targets.push([el, ART_IMAGES[key]]);
  });
  if (!('IntersectionObserver' in window)) {
    targets.forEach(([el, src]) => el.style.setProperty('--art-image', `url("${src}")`));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.style.setProperty('--art-image', `url("${el.dataset.artSrc}")`);
      observer.unobserve(el);
    });
  }, { rootMargin: '300px 0px' });
  targets.forEach(([el, src]) => { el.dataset.artSrc = src; observer.observe(el); });
}

export { initLazyArt };
