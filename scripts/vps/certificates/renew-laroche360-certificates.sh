#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_PATH="/usr/local/sbin/renew-laroche360-certificates"
readonly CPANEL_USER="devlaroche360"
readonly DOMAINS=("appli.laroche360.ca" "automation.laroche360.ca")

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

install_in_cpanel() {
  local domain="$1"
  local lineage="/etc/letsencrypt/live/$domain"
  local response

  for file in cert.pem privkey.pem chain.pem; do
    [[ -s "$lineage/$file" ]] || {
      log "ERROR: fichier absent ou vide: $lineage/$file"
      return 1
    }
  done

  response="$({ DOMAIN="$domain" LINEAGE="$lineage" perl -MJSON::PP -e '
    sub read_file {
      my ($path) = @_;
      open my $fh, "<", $path or die "Impossible de lire $path: $!\n";
      local $/;
      return <$fh>;
    }

    print encode_json({
      domain   => $ENV{"DOMAIN"},
      cert     => read_file("$ENV{LINEAGE}/cert.pem"),
      key      => read_file("$ENV{LINEAGE}/privkey.pem"),
      cabundle => read_file("$ENV{LINEAGE}/chain.pem"),
    });
  ' | /usr/local/cpanel/bin/uapi \
      --input=json \
      --output=json \
      --user="$CPANEL_USER" \
      SSL install_ssl; } 2>&1)"

  if ! perl -MJSON::PP -e '
    local $/;
    my $result = decode_json(<STDIN>);
    exit(($result->{result}{status} // 0) == 1 ? 0 : 1);
  ' <<<"$response"; then
    log "ERROR: échec de l'installation cPanel pour $domain"
    printf '%s\n' "$response"
    return 1
  fi

  log "Certificat cPanel mis à jour: $domain"
}

verify_public_certificate() {
  local domain="$1"
  local output

  output="$(timeout 20 openssl s_client \
    -connect "$domain:443" \
    -servername "$domain" \
    -verify_return_error </dev/null 2>&1)" || true

  if ! grep -q 'Verify return code: 0 (ok)' <<<"$output"; then
    log "ERROR: certificat public invalide pour $domain"
    printf '%s\n' "$output" | tail -n 25
    return 1
  fi

  log "Certificat public valide: $domain"
}

deploy_hook() {
  local renewed_lineage="${RENEWED_LINEAGE:-}"
  local domain

  [[ -n "$renewed_lineage" ]] || {
    log "ERROR: RENEWED_LINEAGE est absent"
    return 1
  }

  domain="$(basename "$renewed_lineage")"
  case "$domain" in
    appli.laroche360.ca|automation.laroche360.ca)
      install_in_cpanel "$domain"
      ;;
    *)
      log "Certificat renouvelé hors périmètre, ignoré: $domain"
      return 0
      ;;
  esac

  /usr/local/cpanel/scripts/ea-nginx config "$CPANEL_USER"
}

main() {
  local domain

  if [[ "${1:-}" == "--deploy-hook" ]]; then
    deploy_hook
    return
  fi

  [[ $# -eq 0 ]] || {
    log "ERROR: argument non autorisé"
    return 2
  }

  log "Vérification du renouvellement Certbot"
  certbot renew --quiet

  for domain in "${DOMAINS[@]}"; do
    verify_public_certificate "$domain"
  done

  log "Renouvellement et contrôles terminés avec succès"
}

main "$@"
