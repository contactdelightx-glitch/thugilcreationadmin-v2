// Field definitions per category, shared by the "Edit design" form and the "Add design" page.
const LABEL_OPTS = ['new', 'sale', 'featured'];
const IMAGE_TYPES = ['BMP', 'JPG', 'PNG'];
const JACQUARD = ['powerloom', 'rapier', 'handloom'];

const money = (k, label) => ({ k, label, type: 'number', step: '0.01', min: '0' });
const whole = (k, label, extra = {}) => ({ k, label, type: 'number', step: '1', min: '0', ...extra });

const LABEL_FIELD = { k: 'label', label: 'Label', select: LABEL_OPTS };

const WEAVE_FORM = [
  { k: 'name', label: 'Name', type: 'text', full: true },
  whole('cards', 'Cards'),
  whole('hooks', 'Hooks'),
  whole('epi', 'EPI', { min: '1' }),
  whole('ppi', 'PPI', { min: '1' }),
  { k: 'harness_build', label: 'Harness build', type: 'text', optional: true },
  { k: 'image_type', label: 'Image type', select: IMAGE_TYPES },
  LABEL_FIELD,
  money('listing_rate', 'Listing rate (₹)'),
  money('final_price', 'Final price (₹)'),
  { k: 'notes', label: 'Notes', textarea: true, optional: true, full: true },
];

export const FORMS = {
  butta: WEAVE_FORM, brocade: WEAVE_FORM, border: WEAVE_FORM, pallu: WEAVE_FORM, pattern: WEAVE_FORM,
  full_set: [
    { k: 'name', label: 'Name', type: 'text', full: true },
    { k: 'jacquard_type', label: 'Jacquard type', select: JACQUARD },
    whole('ppi', 'PPI', { min: '1' }),
    whole('body_epi', 'Body EPI', { min: '1' }),
    whole('border_epi', 'Border EPI', { min: '1', optional: true }),
    { k: 'br_hooks', label: 'BR hooks', type: 'text', optional: true },
    { k: 'by_hooks', label: 'BY hooks', type: 'text', optional: true },
    { k: 'image_type', label: 'Image type', select: IMAGE_TYPES },
    LABEL_FIELD,
    money('listing_rate', 'Listing rate (₹)'),
    money('final_price', 'Final price (₹)'),
  ],
  free_image: [
    { k: 'redirect_url', label: 'Redirect link', type: 'text', full: true },
    LABEL_FIELD,
    money('listing_rate', 'Listing rate (₹)'),
    money('final_price', 'Final price (₹)'),
  ],
};


export const CATEGORY_OPTIONS = [
  { key: 'butta', label: 'Butta' },
  { key: 'brocade', label: 'Brocade' },
  { key: 'border', label: 'Border' },
  { key: 'pallu', label: 'Pallu' },
  { key: 'pattern', label: 'Pattern' },
  { key: 'full_set', label: 'Full Set' },
  { key: 'free_image', label: 'Free Image' },
];

// only asked for when creating (cannot be edited afterwards)
export const CREATE_ONLY_FIELDS = [
  { k: 'designer_email', label: 'Designer email', type: 'email', full: true },
  { k: 'image_url', label: 'Image URL', type: 'url', full: true },
  { k: 'original_image_url', label: 'Original file URL', type: 'url', full: true },
];

// starting values for a new design
export function emptyDesign(category) {
  const v = {};
  [...FORMS[category], ...CREATE_ONLY_FIELDS].forEach((f) => {
    v[f.k] = f.select ? f.select[0] : '';
  });
  if (category === 'free_image') { v.listing_rate = '0'; v.final_price = '0'; }
  return v;
}
