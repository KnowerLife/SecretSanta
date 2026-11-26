/**
 * Декоративные SVG-слои без внешних ассетов и без случайности:
 * разметка одинакова на сервере и при гидратации.
 */
const STARS = [
  { x: 72, y: 118, r: 2.4, delay: 0, cross: true },
  { x: 188, y: 62, r: 1.8, delay: 620, cross: false },
  { x: 306, y: 154, r: 2.1, delay: 1180, cross: true },
  { x: 438, y: 84, r: 1.6, delay: 340, cross: false },
  { x: 574, y: 176, r: 2.6, delay: 1560, cross: false },
  { x: 690, y: 58, r: 1.9, delay: 880, cross: true },
  { x: 812, y: 132, r: 2.2, delay: 240, cross: false },
  { x: 946, y: 74, r: 1.7, delay: 1420, cross: false },
  { x: 1084, y: 168, r: 2.5, delay: 760, cross: true },
  { x: 1216, y: 96, r: 1.8, delay: 1680, cross: false },
  { x: 1352, y: 148, r: 2.2, delay: 480, cross: false },
  { x: 142, y: 342, r: 1.7, delay: 1040, cross: false },
  { x: 372, y: 296, r: 2.3, delay: 180, cross: true },
  { x: 628, y: 358, r: 1.9, delay: 1300, cross: false },
  { x: 884, y: 302, r: 2.1, delay: 560, cross: true },
  { x: 1146, y: 366, r: 1.6, delay: 1640, cross: false },
  { x: 1338, y: 318, r: 2.4, delay: 920, cross: false },
  { x: 248, y: 512, r: 1.8, delay: 1320, cross: false },
  { x: 604, y: 468, r: 2.2, delay: 260, cross: true },
  { x: 968, y: 536, r: 1.7, delay: 1100, cross: false },
  { x: 1274, y: 492, r: 2.3, delay: 700, cross: true },
] as const;

const BULBS = [
  { x: 48, y: 38 },
  { x: 118, y: 55 },
  { x: 196, y: 64 },
  { x: 276, y: 67 },
  { x: 356, y: 66 },
  { x: 436, y: 60 },
  { x: 512, y: 47 },
  { x: 570, y: 31 },
] as const;

const BULB_COLORS = ['gold', 'red', 'pine', 'gold'] as const;

export function FestiveSky() {
  return (
    <div className="festive-sky" aria-hidden="true">
      <div className="festive-sky__glow festive-sky__glow--cool" />
      <div className="festive-sky__glow festive-sky__glow--warm" />
      <svg
        className="festive-sky__stars"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMin slice"
        focusable="false"
      >
        {STARS.map((star, index) => (
          <g
            className="festive-sky__star"
            key={index}
            style={{ animationDelay: `${star.delay}ms` }}
          >
            <circle cx={star.x} cy={star.y} r={star.r} />
            {star.cross && (
              <path
                d={`M${star.x - star.r * 3.2} ${star.y}h${star.r * 6.4}M${star.x} ${star.y - star.r * 3.2}v${star.r * 6.4}`}
              />
            )}
          </g>
        ))}
      </svg>
      <div className="festive-sky__snow festive-sky__snow--far" />
      <div className="festive-sky__snow festive-sky__snow--near" />
    </div>
  );
}

export function FestiveGarland() {
  return (
    <svg
      className="festive-garland"
      viewBox="0 0 600 90"
      aria-hidden="true"
      focusable="false"
    >
      <path className="festive-garland__cord" d="M0 18 C150 82 450 82 600 18" />
      <path className="festive-garland__shine" d="M0 15 C150 79 450 79 600 15" />
      {BULBS.map((bulb, index) => {
        const color = BULB_COLORS[index % BULB_COLORS.length];
        return (
          <g
            className={`festive-garland__bulb festive-garland__bulb--${color}`}
            key={index}
            style={{ animationDelay: `${index * 190}ms` }}
          >
            <circle className="festive-garland__halo" cx={bulb.x} cy={bulb.y} r="13" />
            <circle className="festive-garland__lamp" cx={bulb.x} cy={bulb.y} r="5.5" />
          </g>
        );
      })}
    </svg>
  );
}
