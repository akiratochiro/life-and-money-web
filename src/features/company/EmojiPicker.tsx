import { useState } from "react";
import { TextField } from "../../shared/ui/TextField";

/** Emojis de negócio para escolher com um toque; qualquer outro pode ser colado no campo. */
const COMPANY_EMOJIS = [
  "💼", "💻", "🎨", "📷", "🛠️", "🏗️", "🍰", "☕", "🩺", "📚", "🎵", "✂️",
  "🚚", "🌱", "🏠", "🧘", "🐾", "📈", "⚖️", "🧪", "🎬", "👗", "🍕", "✨",
];

type Props = { value: string; onChange: (emoji: string) => void; error?: string };

/**
 * Sem biblioteca: uma grade com os mais comuns e um campo para colar outro. A API confere que é
 * um único emoji, contado como o usuário o vê (a família 👨‍👩‍👧 é um só).
 */
export function EmojiPicker({ value, onChange, error }: Props) {
  const [custom, setCustom] = useState(COMPANY_EMOJIS.includes(value) ? "" : value);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold text-text-muted">Emoji</legend>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
        {COMPANY_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Usar ${emoji}`}
            aria-pressed={value === emoji}
            onClick={() => {
              setCustom("");
              onChange(emoji);
            }}
            className={`flex h-11 items-center justify-center rounded-2xl text-2xl transition active:scale-95 ${
              value === emoji ? "bg-surface shadow-clay-sm" : ""
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <TextField
        label="Ou cole outro emoji"
        autoComplete="off"
        maxLength={16}
        value={custom}
        error={error}
        onChange={(event) => {
          setCustom(event.target.value);
          if (event.target.value.trim()) onChange(event.target.value.trim());
        }}
      />
    </fieldset>
  );
}
