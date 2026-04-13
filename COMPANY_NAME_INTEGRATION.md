# Company Name Extraction & n8n Analysis Integration

## 📋 Résumé des modifications

Cette implémentation permet:
1. **Extraire le nom de l'entreprise** depuis le fichier Excel lors de l'import
2. **Stocker company_name** avec les données employé
3. **Envoyer company_name à n8n** pour le filtrage des rapports
4. **Déclencher automatiquement l'analyse** après l'import (optionnel)

---

## 🔧 Modifications apportées

### 1. Frontend (Next.js)

**Fichier:** `rps-frontend/nextjs-app/components/rps/survey-builder-demo.tsx`

#### Extraction Excel améliorée (Lignes 396-470)
```typescript
// Utilisation de sheet_to_json au lieu de sheet_to_csv
const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

// Mapping flexible des colonnes Excel
const findColumn = (aliases: string[]): string => {
  const foundKey = keys.find((key) =>
    aliases.some((alias) => key.toLowerCase().trim().includes(alias))
  );
  return foundKey ? row[foundKey] : "";
};

const companyName = findColumn(["entreprise", "company", "société", "employeur", "organisation"]);

// CSV généré avec colonne Entreprise
const csvHeaders = ["Nom", "Prenom", "Adresse courriel", "Fonction", "Entreprise"];
```

#### Colonnes acceptées:
```
Nom: ["nom", "name", "last name", "nom de famille"]
Prenom: ["prenom", "prénom", "first name"]
Email: ["adresse courriel", "courriel", "email", "e-mail", "mail"]
Fonction: ["fonction", "poste", "role", "titre", "department"]
Entreprise: ["entreprise", "company", "société", "employeur", "organisation"] ✨ NOUVEAU
```

#### Logging ajouté:
```javascript
[Excel Import] Extracted X rows from Excel file
[Excel Import] Column headers: [...]
[Excel Import] Generated CSV preview (first 500 chars): ...
[Import Employees] Sending X employees to backend
[Import Employees] CSV headers: Nom,Prenom,Adresse courriel,Fonction,Entreprise
```

---

### 2. Backend (NestJS)

#### A. DTO mis à jour
**Fichier:** `rps-backend/src/campaign-participant/dto/campaign-participant.dto.ts`

```typescript
export class ImportCampaignEmployeeRowDto {
  // ... autres champs
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string;  // ✨ NOUVEAU
}
```

#### B. Entity Employee mise à jour
**Fichier:** `rps-backend/src/employee/employee.entity.ts`

```typescript
@Column({ type: 'varchar', nullable: true })
company_name: string | null;  // ✨ NOUVEAU
```

⚠️ **Note:** Nécessite une migration de base de données pour ajouter la colonne.

#### C. Parser CSV amélioré
**Fichier:** `rps-backend/src/campaign-participant/campaign-participant.service.ts`

```typescript
// Extraction du company_name depuis le CSV
rows.push({
  email,
  first_name: ...,
  last_name: ...,
  department: ...,
  company_name: (row.company_name ?? row.entreprise ?? row.company ?? '').trim() || undefined,
});
```

#### D. Stockage pendant l'import
```typescript
newEmployeesData.push(
  this.employeeRepository.create({
    first_name: ...,
    last_name: ...,
    email,
    department: ...,
    company_name: row.company_name?.trim() || undefined,  // ✨ NOUVEAU
    survey_token: randomUUID(),
    company: { id: payload.company_id },
  }),
);
```

#### E. Payload n8n avec company_name
**Fichier:** `rps-backend/src/campaign/campaign.service.ts`

```typescript
async analyze(campaignId: number, userEmail: string) {
  const companyName = campaign.company?.name || 'Entreprise';
  
  const payload = {
    campaign_id: campaignId,
    campaign_name: campaign.name,
    company_name: companyName,  // ✨ NOUVEAU - pour filtrage n8n
    user_email: userEmail,
  };
  
  await fetch(this.n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Nouvelle méthode avec company_name personnalisé
async analyzeWithCompanyName(campaignId: number, userEmail: string, companyName?: string) {
  const finalCompanyName = companyName || campaign.company?.name || 'Entreprise';
  
  const payload = {
    campaign_id: campaignId,
    campaign_name: campaign.name,
    company_name: finalCompanyName,  // ✨ NOUVEAU
    user_email: userEmail,
  };
  
  // ... webhook call
}
```

#### F. Auto-trigger d'analyse après import
**Fichier:** `rps-backend/src/campaign-participant/campaign-participant.service.ts`

```typescript
// Après l'import, extraction des company names
const companyNames = employees
  .map(e => e.company_name)
  .filter(Boolean) as string[];

const uniqueCompanyNames = [...new Set(companyNames)];

// Auto-trigger si conditions remplies
this.triggerAnalysisIfReady(campaignId, uniqueCompanyNames[0]);

// Logique de déclenchement automatique
private async triggerAnalysisIfReady(campaignId: number, companyName?: string) {
  // Vérifie le taux de complétion
  const completedCount = participants.filter(
    p => p.status === CampaignParticipantStatus.COMPLETED
  ).length;
  
  // Déclenche si >= 50% complété OU >= 5 réponses
  if (completedCount >= 5 || completionRate >= 0.5) {
    await this.campaignService.analyzeWithCompanyName(
      campaignId,
      userEmail,
      companyName,
    );
  }
}
```

#### G. Nouvel endpoint pour analyse manuelle
**Fichier:** `rps-backend/src/campaign/campaign.controller.ts`

```typescript
@Post(':id/analyze-with-company')
@UseGuards(AuthGuard)
async analyzeWithCompany(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: { company_name?: string },
  @Req() req: AuthenticatedRequest,
) {
  return this.campaignService.analyzeWithCompanyName(
    id,
    req.user.email,
    body.company_name,
  );
}
```

---

## 📊 Flux de données complet

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend - Import Excel                                   │
│    - Lecture fichier Excel avec sheet_to_json               │
│    - Mapping flexible des colonnes                          │
│    - Extraction: Nom, Prenom, Email, Fonction, Entreprise   │
│    - Génération CSV avec colonne Entreprise                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend → Backend                                        │
│    POST /api/admin/campaign-participants                     │
│    {                                                         │
│      campaignId: 1,                                          │
│      companyId: 1,                                           │
│      csv: "Nom,Prenom,Adresse courriel,Fonction,Entreprise"  │
│    }                                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend - Parsing CSV                                     │
│    - Extraction company_name depuis CSV                     │
│    - Colonnes acceptées: entreprise, company, société...    │
│    - Création employés avec company_name                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend - Stockage DB                                     │
│    INSERT INTO employees                                     │
│    (first_name, last_name, email, department, company_name)  │
│    VALUES ('Jean', 'Dupont', 'jean@email.com', 'Dev', 'ACME')│
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Auto-Trigger Analysis (Optionnel)                         │
│    - Vérifie taux de complétion                             │
│    - Si >= 50% OU >= 5 réponses:                            │
│      → Trigger analyse automatiquement                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Backend → n8n Webhook                                     │
│    POST http://localhost:5678/webhook/sondage-rps...        │
│    {                                                         │
│      "campaign_id": 1,                                       │
│      "campaign_name": "Sondage RPS 2024",                   │
│      "company_name": "ACME Corp",  ← POUR FILTRAGE         │
│      "user_email": "admin@example.com"                       │
│    }                                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. n8n Workflow                                              │
│    - Reçoit company_name                                    │
│    - Filtre/tri des rapports par entreprise                 │
│    - Stockage dans Google Sheets/Drive avec company_name    │
│    - Envoi email avec rapport personnalisé                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Comment tester

### 1. Préparer un fichier Excel

Créez un fichier Excel avec ces colonnes (ordre libre):

| Nom | Prénom | Email | Fonction | Entreprise |
|-----|--------|-------|----------|------------|
| Dupont | Jean | jean@email.com | Développeur | ACME Corp |
| Martin | Marie | marie@email.com | Designer | ACME Corp |

### 2. Migration de base de données

Ajouter la colonne `company_name` à la table `employees`:

```sql
-- PostgreSQL
ALTER TABLE employees ADD COLUMN company_name VARCHAR(255) NULL;

-- ou via TypeORM migration
await queryRunner.query(
  `ALTER TABLE employees ADD COLUMN company_name VARCHAR(255) NULL`
);
```

### 3. Tester l'import

1. **Ouvrir la console du navigateur** (F12)
2. **Importer le fichier Excel** dans le Survey Builder
3. **Vérifier les logs:**
   ```
   [Excel Import] Extracted 2 rows from Excel file
   [Excel Import] Column headers: ['Nom', 'Prénom', 'Email', 'Fonction', 'Entreprise']
   [Excel Import] Generated CSV preview: Nom,Prenom,Adresse courriel,Fonction,Entreprise
   Dupont,Jean,jean@email.com,Développeur,ACME Corp
   ...
   [Import Employees] CSV headers: Nom,Prenom,Adresse courriel,Fonction,Entreprise
   ```

### 4. Vérifier le backend

Les logs backend montreront:
```
[CSV] Headers detected: ['nom', 'prenom', 'email', 'fonction', 'entreprise']
[Import] Company names extracted: ['ACME Corp']
[Auto-Analysis] Triggering analysis for campaign 1 (0/2 completed, ACME Corp)
```

### 5. Tester l'analyse manuelle

```bash
curl -X POST http://localhost:3001/campaigns/1/analyze-with-company \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "ACME Corp"}'
```

### 6. Vérifier n8n

Le workflow n8n recevra:
```json
{
  "campaign_id": 1,
  "campaign_name": "Sondage RPS 2024",
  "company_name": "ACME Corp",
  "user_email": "admin@example.com"
}
```

---

## ⚙️ Configuration

### Variables d'environnement

```bash
# Backend .env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/sondage-rps-solutions-tech
ADMIN_EMAIL=admin@yourcompany.com

# Frontend .env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Seuil de déclenchement automatique

Dans `campaign-participant.service.ts`, ajustez:

```typescript
// Déclenche si >= 5 réponses complétées
if (completedCount >= 5 || completionRate >= 0.5) {
  // ...
}
```

Modifiez selon vos besoins:
- `completedCount >= 10` - minimum 10 réponses
- `completionRate >= 0.7` - 70% de complétion
- `completedCount >= 3 && completionRate >= 0.3` - 3 réponses ET 30%

---

## 📝 Notes importantes

### 1. Migration de base de données
⚠️ **Obligatoire** avant de déployer:
```bash
cd rps-backend
npm run typeorm migration:generate -- -n AddCompanyNameToEmployee
```

### 2. Rétrocompatibilité
- ✅ L'import fonctionne même si la colonne Entreprise est absente
- ✅ company_name est nullable dans la DB
- ✅ Fallback sur le nom de l'entreprise du campaign

### 3. Performance
- L'auto-trigger s'exécute en background (`.catch()` sans await)
- Ne bloque pas la réponse de l'import
- Logs détaillés pour le debugging

### 4. Sécurité
- company_name est validé (MaxLength 255)
- Injection SQL protégée par TypeORM parameterized queries
- Endpoints protégés par AuthGuard

---

## 🔍 Dépannage

### Problème: "Le fichier Excel est vide"
**Solution:** Vérifiez que le fichier contient des données dans la première feuille

### Problème: "Colonnes manquantes"
**Solution:** Le fichier Excel doit avoir au minimum: Nom, Prénom, Email, Fonction

### Problème: "Company name non extrait"
**Solution:** 
1. Vérifiez les logs frontend pour les headers détectés
2. Assurez-vous que la colonne s'appelle: Entreprise, Company, Société, Employeur ou Organisation

### Problème: "Auto-trigger ne se déclenche pas"
**Solution:**
1. Vérifiez les logs `[Auto-Analysis]`
2. Assurez-vous qu'il y a assez de réponses complétées
3. Vérifiez que ADMIN_EMAIL est configuré

### Problème: "n8n ne reçoit pas company_name"
**Solution:**
1. Vérifiez les logs backend pour le payload envoyé
2. Testez le webhook manuellement avec curl
3. Vérifiez que N8N_WEBHOOK_URL est correct

---

## 📊 Prochaines étapes

### Pour n8n:
1. **Mettre à jour le workflow n8n** pour utiliser `company_name`
2. **Ajouter un nœud de filtrage** pour trier par entreprise
3. **Stocker les rapports** dans des dossiers nommés par entreprise
4. **Personnaliser l'email** avec le logo/nom de l'entreprise

### Pour le backend:
1. **Ajouter un endpoint** pour déclencher l'analyse par lot d'entreprises
2. **Scheduler** l'analyse automatique périodique
3. **Dashboard** pour suivre l'avancement par entreprise

### Pour le frontend:
1. **Afficher company_name** dans la liste des employés importés
2. **Permettre le filtrage** par entreprise dans les rapports
3. **Exporter les rapports** par entreprise

---

## 📞 Support

Pour toute question ou problème:
1. Vérifiez les logs frontend (console navigateur)
2. Vérifiez les logs backend (console serveur)
3. Consultez la section Dépannage ci-dessus
4. Contactez l'équipe de développement

---

**Date de création:** 2026-04-12  
**Version:** 1.0.0  
**Auteur:** Assistant IA
