# Renouvellement TLS Laroche360 piloté par n8n

Le workflow n8n se connecte au VPS par SSH et exécute uniquement :

```text
sudo /usr/local/sbin/renew-laroche360-certificates
```

Les sources des scripts opérationnels sont versionnées dans
`scripts/vps/certificates/`. Ce répertoire de documentation conserve seulement
le workflow importable et son mode d'emploi.

Le script lance `certbot renew`. Le hook persistant
`50-sync-laroche360-to-cpanel`, exécuté uniquement après un renouvellement
réussi, installe le certificat dans cPanel avec `SSL install_ssl` et reconstruit
la configuration EA-Nginx. Le script principal vérifie ensuite les deux
certificats publics.

Le hook persistant couvre aussi les renouvellements éventuellement lancés par
le `certbot.timer` du système, et pas seulement ceux déclenchés par n8n.

Le workflow est livré désactivé. Il faut lui assigner un credential SSH, le
tester manuellement, puis l'activer.
