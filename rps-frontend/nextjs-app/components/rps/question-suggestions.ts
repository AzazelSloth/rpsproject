export const AGREEMENT_SCALE_OPTIONS = [
  "Pas du tout d’accord",
  "Plutôt en désaccord",
  "Ni d’accord ni en désaccord",
  "Plutôt d’accord",
  "Tout à fait d’accord",
] as const;

export const FREQUENCY_SCALE_OPTIONS = [
  "Jamais",
  "Rarement",
  "Parfois",
  "Souvent",
  "Très souvent",
] as const;

export type QuestionSuggestion = {
  title: string;
  type: "scale" | "choice" | "text";
  options?: readonly string[];
};

export type QuestionSuggestionSection = {
  number: number;
  title: string;
  optional?: boolean;
  questions: readonly QuestionSuggestion[];
};

export const QUESTION_SUGGESTION_SECTIONS: readonly QuestionSuggestionSection[] = [
  {
    number: 1,
    title: "La charge de travail",
    questions: [
      { title: "Au cours des 4 dernières semaines, à quelle fréquence avez-vous manqué de temps pour accomplir l’ensemble de vos tâches?", type: "scale", options: FREQUENCY_SCALE_OPTIONS },
      { title: "Au cours des 4 dernières semaines, à quelle fréquence le travail s’est-il accumulé plus vite que vous ne pouviez le traiter?", type: "scale", options: FREQUENCY_SCALE_OPTIONS },
      { title: "Au cours des 4 dernières semaines, à quelle fréquence avez-vous dû maintenir une cadence de travail très rapide?", type: "scale", options: FREQUENCY_SCALE_OPTIONS },
      { title: "Au cours des 4 dernières semaines, à quelle fréquence des échéances serrées vous ont-elles mis sous pression?", type: "scale", options: FREQUENCY_SCALE_OPTIONS },
      { title: "Au cours des 4 dernières semaines, à quelle fréquence votre travail vous a-t-il placé dans des situations émotionnellement exigeantes?", type: "scale", options: FREQUENCY_SCALE_OPTIONS },
    ],
  },
  {
    number: 2,
    title: "L’autonomie et le développement",
    questions: [
      { title: "Je peux organiser mon travail à ma façon, à l’intérieur de mes responsabilités.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "J’ai mon mot à dire sur les décisions qui touchent directement mon travail.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Je peux prendre une pause quand j’en ai besoin.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Mon travail me permet d’utiliser pleinement mes compétences.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "J’ai des occasions d’apprendre et de me développer dans mon travail.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
    ],
  },
  {
    number: 3,
    title: "La reconnaissance et l’information",
    questions: [
      { title: "Les efforts que je fournis sont reconnus à leur juste valeur.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Je reçois des retours utiles sur la qualité de mon travail.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Mon travail est respecté par la direction.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Je reçois à temps l’information nécessaire pour bien faire mon travail.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Je suis informé(e) à l’avance des changements qui me concernent.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
    ],
  },
  {
    number: 4,
    title: "Le soutien et l’équipe",
    questions: [
      { title: "Mon supérieur immédiat m’aide à résoudre les difficultés quand j’en ai besoin.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Je peux parler ouvertement à mon supérieur immédiat quand quelque chose ne va pas.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Je peux compter sur l’aide de mes collègues quand j’en ai besoin.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Je me sens à ma place dans mon équipe.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Mon supérieur immédiat organise bien le travail de l’équipe.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
    ],
  },
  {
    number: 5,
    title: "La justice et la confiance",
    questions: [
      { title: "La répartition des tâches au sein de mon équipe est équitable.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Les décisions qui nous touchent sont prises de façon transparente.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Les conflits sont traités de manière juste.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Tous les employés sont traités avec le même respect, peu importe leur rôle.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Je fais confiance aux informations qui viennent de la direction.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
    ],
  },
  {
    number: 6,
    title: "Le rôle, le sens et les moyens",
    questions: [
      { title: "Je sais exactement ce qu’on attend de moi dans mon travail.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Mes priorités restent claires quand plusieurs demandes arrivent en même temps.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Mon travail a du sens pour moi.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "Ce qu’on me demande de faire respecte mes valeurs professionnelles.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
      { title: "J’ai les outils et l’équipement nécessaires pour bien faire mon travail.", type: "scale", options: AGREEMENT_SCALE_OPTIONS },
    ],
  },
  {
    number: 7,
    title: "L’énergie et l’équilibre",
    questions: [
      { title: "Au cours des 4 dernières semaines, à quelle fréquence vous êtes-vous senti(e) vidé(e) d’énergie à cause de votre travail?", type: "scale", options: FREQUENCY_SCALE_OPTIONS },
      { title: "Au cours des 4 dernières semaines, à quelle fréquence votre travail a-t-il empiété sur votre vie personnelle?", type: "scale", options: FREQUENCY_SCALE_OPTIONS },
      { title: "Au cours des 4 dernières semaines, à quelle fréquence avez-vous eu de la difficulté à récupérer entre deux journées de travail?", type: "scale", options: FREQUENCY_SCALE_OPTIONS },
    ],
  },
  {
    number: 8,
    title: "La question ouverte",
    questions: [
      { title: "Souhaitez-vous ajouter quelque chose sur votre expérience de travail?", type: "text" },
    ],
  },
  {
    number: 9,
    title: "La question de secteur",
    optional: true,
    questions: [
      { title: "Dans quel [département / service / équipe] travaillez-vous?", type: "choice", options: [] },
      { title: "Dans quel établissement travaillez-vous?", type: "choice", options: [] },
      { title: "Occupez-vous un poste de gestion?", type: "choice", options: [] },
    ],
  },
] as const;
