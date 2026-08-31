const PRIVACY_RESOURCES_URL = "#";

export function SurveyPrivacyFooter() {
  return (
    <footer className="border-t border-slate-200 pt-4 text-center text-xs leading-5 text-slate-500">
      Voici les ressources confidentialité, pour savoir plus{" "}
      <a
        href={PRIVACY_RESOURCES_URL}
        className="font-semibold text-slate-700 underline underline-offset-2"
      >
        cliquez-ici
      </a>
      .
    </footer>
  );
}
