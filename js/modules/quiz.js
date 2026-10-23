/* Quiz olfativo: radios nativos (teclado/leitor de tela), foco no título a cada etapa. */
import { catalog } from "../catalog.js";
import { $, h, money } from "./dom.js";
import { openLayer } from "./modal.js";

const QUESTIONS = [
  { title: "Qual sensação combina com você?", options: [["Acolhedora", "Notas quentes e envolventes", "doce"], ["Elegante", "Madeiras sofisticadas", "amadeirado"], ["Luminosa", "Flores e cítricos radiantes", "floral"], ["Leve", "Frescor limpo e natural", "fresco"]] },
  { title: "Quando você mais usaria essa fragrância?", options: [["No dia a dia", "Versátil e confortável", "fresco"], ["À noite", "Marcante e envolvente", "doce"], ["Em qualquer ocasião", "Equilibrada e sofisticada", "amadeirado"], ["Em momentos especiais", "Floral e memorável", "floral"]] },
  { title: "Como gostaria de ser lembrada(o)?", options: [["Pela presença", "Intensa e inesquecível", "amadeirado"], ["Pela delicadeza", "Suave e elegante", "floral"], ["Pela energia", "Fresca e espontânea", "fresco"], ["Pelo mistério", "Quente e sensual", "doce"]] },
];
const ORDER = ["amadeirado", "floral", "fresco", "doce"];
let answers = [], step = 0, openProductFn = () => {};

function focusTitle() { requestAnimationFrame(() => $("#quizTitle")?.focus({ preventScroll: true })); }

function render() {
  const box = $("#quizContent");
  if (step >= QUESTIONS.length) {
    const scores = Object.fromEntries(ORDER.map((f) => [f, 0]));
    answers.forEach((a) => { scores[a]++; });
    const family = ORDER.slice().sort((a, b) => scores[b] - scores[a])[0];   // empate → ordem fixa
    const m = catalog.byFamily.get(family) || catalog.products[0];
    box.replaceChildren(
      h("p", { class: "eyebrow" }, "SUA ASSINATURA LOMBELLE"),
      h("h2", { id: "quizTitle", tabindex: "-1" }, "Talvez seja um encontro."),
      m ? h("p", { class: "quiz-lead" }, `Pelas suas escolhas, sugerimos uma fragrância ${family}. Conheça esta composição e veja se ela combina com você.`) : h("p", { class: "quiz-lead" }, "O catálogo está indisponível no momento. Tente novamente em instantes."),
      m ? h("div", { class: "quiz-result" }, h("img", { src: m.image, alt: "", width: 105, height: 130 }),
        h("div", {}, h("span", { class: "eyebrow" }, m.category), h("h3", {}, m.name), h("p", {}, m.notes), h("strong", {}, money(m.price)))) : null,
      m ? h("button", { type: "button", class: "button button-dark", onClick: () => openProductFn(m.id) }, "CONHECER FRAGRÂNCIA ", h("span", { "aria-hidden": "true" }, "↗")) : null,
      " ", h("button", { type: "button", class: "text-button", onClick: start }, "REFAZER QUIZ"));
    return focusTitle();
  }
  const q = QUESTIONS[step], last = step === QUESTIONS.length - 1;
  const next = h("button", { type: "button", class: "button button-dark", disabled: !answers[step], onClick: () => { step++; render(); } }, last ? "VER SUGESTÃO " : "CONTINUAR ", h("span", { "aria-hidden": "true" }, "↗"));
  box.replaceChildren(
    h("span", { class: "quiz-step" }, `QUIZ OLFATIVO · 0${step + 1} / 0${QUESTIONS.length}`),
    h("h2", { id: "quizTitle", tabindex: "-1" }, q.title),
    h("fieldset", { class: "quiz-fieldset" }, h("legend", { class: "sr-only" }, q.title),
      h("div", { class: "quiz-options" }, q.options.map(([title, desc, val]) =>
        h("label", { class: "quiz-option" },
          h("input", { type: "radio", name: `q${step}`, value: val, checked: answers[step] === val, onChange: () => { answers[step] = val; next.disabled = false; } }),
          h("strong", {}, title), h("span", {}, desc))))),
    h("div", { class: "quiz-controls" },
      h("button", { type: "button", class: "text-button", disabled: step === 0, onClick: () => { step--; render(); } }, "← VOLTAR"), next));
  focusTitle();
}
function start() { answers = []; step = 0; render(); }

export function initQuiz({ openProduct }) {
  openProductFn = openProduct;
  const open = () => { start(); openLayer($("#quizModal"), { initialFocus: "#quizTitle" }); };
  $("#quizOpen").addEventListener("click", open);
  $("#footerQuiz").addEventListener("click", open);
}
