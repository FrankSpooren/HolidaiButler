import { TranslatableRichTextField } from '../fields/index.js';

/**
 * RichTextEditor — i18n-aware via TranslatableRichTextField wrapper.
 * supportedLanguages wordt auto-picked uit DestinationContext (PagesPage Provider).
 *
 * Backward-compat: legacy block.props.content als string wordt geinterpreteerd als EN.
 *
 * @version BLOK D (22-05-2026)
 */
export default function RichTextEditor({ block, onChange }) {
  const props = block.props || {};
  return (
    <TranslatableRichTextField
      label="Content"
      value={props.content}
      onChange={v => onChange({ ...props, content: v })}
      helperText="Rich-text content per taal. Auto-translate via DeepL beschikbaar."
    />
  );
}
