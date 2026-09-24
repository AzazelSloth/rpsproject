const PRIVACY_RESOURCES_URL = "https://laroche360.odoo.com/ressources-d-aide";
const PRIVACY_URL = "https://laroche360.odoo.com/confidentialite";

export function SurveyPrivacyFooter() {
  return (
    <footer className="border-t border-line pt-4 text-center text-xs leading-5 text-muted">
      <a
        href={PRIVACY_RESOURCES_URL}
        target="_blank"
        className="text-accent underline underline-offset-2 hover:!underline"
      >
        Ressources d'aide
      </a>
      {" · "}
      <a
        href={PRIVACY_URL}
        target="_blank"
        className="text-accent underline underline-offset-2 hover:!underline"
      >
        Confidentialité
      </a>
    </footer>
  );
}
