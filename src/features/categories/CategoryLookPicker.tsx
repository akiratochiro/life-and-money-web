import { useId } from "react";
import { CATEGORY_COLORS, CATEGORY_ICONS, COLOR_ORDER, ICON_ORDER, type CategoryColor, type CategoryIcon } from "./categoryLook";
import { CategoryGlyph } from "./CategoryGlyph";

type Props = {
  color: CategoryColor;
  icon: CategoryIcon;
  onChange: (look: { color: CategoryColor; icon: CategoryIcon }) => void;
};

/**
 * Cor e ícone da categoria. São rádios nativos, escondidos visualmente: o navegador cuida das
 * setas, do foco e do anúncio no leitor de tela, e só a aparência é desenhada aqui.
 */
export function CategoryLookPicker({ color, icon, onChange }: Props) {
  const name = useId();
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-text-muted">Cor</legend>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_ORDER.map((option) => (
            <label key={option} className="flex min-h-11 cursor-pointer items-center justify-center">
              <input
                type="radio"
                name={`${name}-color`}
                value={option}
                checked={color === option}
                onChange={() => onChange({ color: option, icon })}
                aria-label={CATEGORY_COLORS[option].label}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`h-9 w-9 rounded-full shadow-clay-sm ring-offset-2 ring-offset-surface transition peer-checked:ring-2 peer-checked:ring-text peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${CATEGORY_COLORS[option].swatch}`}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-text-muted">Ícone</legend>
        <div className="grid grid-cols-5 gap-2">
          {ICON_ORDER.map((option) => (
            <label key={option} className="flex cursor-pointer items-center justify-center">
              <input
                type="radio"
                name={`${name}-icon`}
                value={option}
                checked={icon === option}
                onChange={() => onChange({ color, icon: option })}
                aria-label={CATEGORY_ICONS[option]}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
                  icon === option ? `${CATEGORY_COLORS[color].tile} shadow-clay-sm ring-2 ring-text` : "bg-sunken text-text-muted"
                }`}
              >
                <CategoryGlyph icon={option} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
