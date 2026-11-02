/**
 * Uma vibração curta de confirmação. Funciona no Android (Chrome, Firefox); no iOS o Safari não
 * tem navigator.vibrate, e a função simplesmente não faz nada. Também não faz nada se o navegador
 * recusar (alguns só vibram depois de um toque do usuário na página).
 */
export function confirmHaptic(ms = 15): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch {
    // Vibrar é um extra: nunca pode quebrar o salvar.
  }
}
