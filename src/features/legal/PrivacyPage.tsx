import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "../../shared/brand/Logo";

const REPOSITORY = "https://github.com/akiratochiro/life-and-money-web";

/** Data da última mudança no texto. Mude junto com o conteúdo. */
export const PRIVACY_UPDATED_AT = "9 de novembro de 2026";

/**
 * O que o app guarda, onde e por quê. Pública (fora do RequireAuth): quem ainda vai criar a conta
 * precisa conseguir ler antes. O texto descreve o que o código faz hoje; mudou o comportamento
 * (um cookie, um serviço, um dado novo), muda aqui também.
 */
export function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-canvas px-5 pb-16 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <article className="mx-auto w-full max-w-2xl">
        <Logo />
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight">Privacidade</h1>
        <p className="mt-2 text-sm text-text-muted">Atualizada em {PRIVACY_UPDATED_AT}.</p>

        <div className="mt-6 rounded-2xl bg-sunken p-4 text-sm leading-relaxed text-text">
          O Life and Money é um <strong>projeto de portfólio</strong>, mantido por uma pessoa, sem empresa por trás
          e sem garantia de que vai continuar no ar. Use à vontade, mas prefira valores aproximados ou fictícios
          a dados financeiros reais e sensíveis.
        </div>

        <Section title="O que fica guardado">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Seu nome e seu e-mail. Até você confirmar o e-mail, o cadastro fica guardado por no máximo 24
              horas e depois é apagado; a conta só existe depois da confirmação.
            </li>
            <li>Sua senha, só como hash BCrypt: nem quem administra o banco consegue ler a senha.</li>
            <li>O que você cadastra: categorias, transações, orçamentos, metas e contas.</li>
            <li>
              As sessões abertas, também só como hash. Os links de redefinição de senha valem 30 minutos e uma
              vez só.
            </li>
          </ul>
        </Section>

        <Section title="O que não fica guardado">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Seu endereço IP não vai para o banco: ele é usado só na memória do servidor, para limitar tentativas
              de login e evitar abuso.
            </li>
            <li>Não há anúncios, rastreadores nem ferramentas de análise de terceiros.</li>
            <li>Seus dados não são vendidos nem compartilhados com ninguém.</li>
          </ul>
        </Section>

        <Section title="Cookies e armazenamento no navegador">
          <p>Só o necessário para a conta funcionar, nenhum de propaganda ou de medição:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <code className="font-semibold">refreshToken</code>: mantém você logado por até 30 dias.
            </li>
            <li>
              <code className="font-semibold">loginDevice</code>: lembra que este navegador já entrou na sua conta
              (por um ano), para que alguém errando a senha com o seu e-mail não bloqueie o seu acesso.
            </li>
            <li>
              A opção de esconder os valores da tela fica guardada só nesta aba (<code>sessionStorage</code>).
            </li>
          </ul>
          <p className="mt-2">
            Os dois cookies são inacessíveis para scripts da página e só vão para as chamadas de login e sessão.
          </p>
        </Section>

        <Section title="Onde os dados ficam">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>O site é servido pela Cloudflare.</li>
            <li>A API roda no Render, e o banco de dados fica no Neon, ambos nos Estados Unidos.</li>
            <li>
              Os e-mails do app (confirmação do cadastro e redefinição de senha) saem pelo Brevo, que recebe seu nome e seu e-mail
              para fazer a entrega.
            </li>
            <li>
              Ao criar ou trocar a senha, o app confere se ela já apareceu em vazamentos de dados, no serviço
              Pwned Passwords. A senha não sai do servidor: vão só os 5 primeiros caracteres de um resumo
              (hash) dela, que não permitem descobri-la.
            </li>
            <li>Os feriados do calendário de contas vêm da BrasilAPI, que recebe só o ano consultado.</li>
          </ul>
          <p className="mt-2">
            O servidor guarda registros técnicos (erros, com o número interno da conta) por tempo limitado, para
            investigar problemas.
          </p>
        </Section>

        <Section title="Seus direitos">
          <p>
            Pela LGPD, você pode ver, levar e apagar seus dados, e tudo isso está no próprio app, em{" "}
            <strong>Minha conta</strong>:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Exportar meus dados</strong> baixa tudo o que é seu, num arquivo JSON.
            </li>
            <li>
              <strong>Excluir conta</strong> apaga a conta e todos os dados dela na hora, sem cópia guardada.
            </li>
          </ul>
        </Section>

        <Section title="Segurança">
          <p>
            Todo o tráfego usa HTTPS. A sessão expira e se renova sozinha, trocar a senha encerra todas as sessões,
            e o código é público no GitHub, para qualquer pessoa conferir o que está escrito aqui.
          </p>
        </Section>

        <Section title="Contato">
          <p>
            Dúvidas ou pedidos sobre privacidade podem ser abertos como issue no{" "}
            <a href={REPOSITORY} className="font-bold text-link underline" rel="noreferrer" target="_blank">
              repositório do projeto
            </a>
            . Não escreva dados pessoais na issue: ela é pública.
          </p>
        </Section>

        <Link to="/" className="mt-10 flex min-h-11 items-center font-bold text-link">
          Voltar
        </Link>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-2 text-[15px] leading-relaxed text-text-soft">{children}</div>
    </section>
  );
}
