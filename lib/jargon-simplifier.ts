/**
 * Jargon Simplification for Memora Dashboard
 *
 * Maps technical/medical terms to plain language for elderly users
 * with varying tech literacy and cognitive abilities.
 */

export const jargonMap: Record<string, string> = {
  // Medications
  'Leqembi': 'memory medication',
  'medication': 'medicine',

  // Technical metrics
  'Acceleration Peak': 'Force of movement',
  '2.4 g': 'a strong force (like a fall)',
  'Safe Radius': 'Safe walking area',
  '110 meters': 'about a city block',
  '110m': 'about a city block',
  'Confidence: 73%': 'Likely correct',
  'Confidence': 'How sure we are',

  // Dashboard terms
  'Engagement Score': 'How active you were',
  'Sensor Alert': 'Safety notice',
  'Pattern Change': 'Change in routine',
  'Memory Update': 'New memory note',
  'Wandering Detection': 'Walking monitor',
  'Activity Pattern Monitoring': 'Daily routine check',
  'Fall Detection': 'Fall safety check',

  // Time/location
  'quiet hours': 'nighttime',
  'outside quiet hours': 'during the day',
  'safe radius': 'safe area',

  // Technical jargon
  'escalation delay': 'wait time before alert',
  'inactivity threshold': 'time without movement',
  'sensitivity': 'how careful the detector is',

  // Status indicators
  'acceleration peak': 'strongest movement',
  'stillness duration': 'time not moving',
  'geolocation': 'location tracker',
  'accelerometer': 'movement sensor',

  // Actions
  'acknowledged': 'confirmed',
  'cadence': 'schedule',
  'variance': 'change'
};

/**
 * Replace technical jargon with simple language
 */
export function simplifyText(text: string): string {
  let simplified = text;

  // Sort by length descending to replace longer phrases first
  const sortedKeys = Object.keys(jargonMap).sort((a, b) => b.length - a.length);

  for (const jargon of sortedKeys) {
    const simple = jargonMap[jargon];
    // Case-insensitive replacement, preserve original case pattern
    const regex = new RegExp(jargon, 'gi');
    simplified = simplified.replace(regex, simple);
  }

  return simplified;
}

/**
 * Simplify all text content in dashboard cards
 */
export function simplifyDashboard(enable: boolean = true) {
  if (!enable) {
    // Reload page to restore original text
    window.location.reload();
    return;
  }

  // Find all text-containing elements in dashboard
  const selectors = [
    '.event-type',
    '.event-summary',
    '.card-label',
    '.card-value',
    '.card-subtitle',
    '.config-label',
    '.config-value',
    '.alert-config-name',
    '.insight-item-text',
    '.archival-title',
    '.core-memory-label',
    '.event-details-item'
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el.textContent) {
        const original = el.textContent;
        const simplified = simplifyText(original);
        if (original !== simplified) {
          // Store original in data attribute for toggle back
          if (!el.getAttribute('data-original')) {
            el.setAttribute('data-original', original);
          }
          el.textContent = simplified;
        }
      }
    });
  });
}

/**
 * Text-to-speech for dashboard content
 */
export function speakDashboardContent() {
  if (!window.speechSynthesis) {
    alert('Speech not supported in this browser');
    return;
  }

  // Get current page content
  const page = document.querySelector('.page.active') || document.querySelector('.page');
  if (!page) return;

  // Build spoken description
  const pageTitle = page.querySelector('.page-title')?.textContent || '';
  const pageSubtitle = page.querySelector('.page-subtitle')?.textContent || '';

  let spokenText = `${pageTitle}. ${pageSubtitle}. `;

  // Add card content
  const cards = page.querySelectorAll('.card, .insight-section, .settings-section, .timeline-event-card');
  cards.forEach((card, index) => {
    const label = card.querySelector('.card-label, .insight-title, .settings-title, .event-summary')?.textContent;
    const value = card.querySelector('.card-value, .insight-stat-value')?.textContent;
    const subtitle = card.querySelector('.card-subtitle, .event-details')?.textContent;

    if (label) spokenText += `${label}. `;
    if (value) spokenText += `${value}. `;
    if (subtitle) spokenText += `${subtitle}. `;
  });

  // Simplify before speaking
  const simplifiedText = simplifyText(spokenText);

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Speak
  const utterance = new SpeechSynthesisUtterance(simplifiedText);
  utterance.rate = 0.85; // Slower for elderly
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}
