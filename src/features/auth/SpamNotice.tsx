/**
 * O e-mail do app cai no spam: ele sai pelo Brevo sem um domínio próprio autenticado (SPF/DKIM),
 * e os provedores desconfiam de remetentes assim. Um domínio próprio resolveria, mas é pago; até
 * lá, a tela diz isso com todas as letras, logo depois de mandar o e-mail, em vez de esperar a
 * pessoa achar que ele não chegou.
 */
export function SpamNotice() {
  return (
    <div className="rounded-2xl bg-sunken p-4 text-sm leading-relaxed text-text">
      <p className="font-bold">Procure também na caixa de spam.</p>
      <p className="mt-1 text-text-soft">
        O e-mail costuma ir parar lá (no Gmail, às vezes em Promoções). Se estiver, marque como “não é spam” para
        os próximos chegarem na caixa de entrada.
      </p>
    </div>
  );
}
