<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Str;

class AdminTournamentRegistrationPdfController extends Controller
{
    public function __invoke(Tournament $tournament)
    {
        $teams = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->orderBy('name')
            ->get();

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');

        $pdf = new Dompdf($options);
        $pdf->loadHtml($this->html($tournament, $teams), 'UTF-8');
        $pdf->setPaper('A4', 'portrait');
        $pdf->render();

        $filename = Str::slug($tournament->title ?: 'tournoi').'-equipes-inscrites.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    public function qualified(Tournament $tournament)
    {
        $teams = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->get();

        $qualifiedTeams = $this->qualifiedTeams($tournament, $teams);

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');

        $pdf = new Dompdf($options);
        $pdf->loadHtml($this->qualifiedHtml($tournament, $qualifiedTeams), 'UTF-8');
        $pdf->setPaper('A4', 'portrait');
        $pdf->render();

        $filename = Str::slug($tournament->title ?: 'tournoi').'-top-12-qualifies.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    public function qualifiedLogos(Tournament $tournament)
    {
        $teams = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->get();

        $qualifiedTeams = $this->qualifiedTeams($tournament, $teams);

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');

        $pdf = new Dompdf($options);
        $pdf->loadHtml($this->qualifiedLogosHtml($qualifiedTeams), 'UTF-8');
        $pdf->setPaper('A4', 'portrait');
        $pdf->render();

        $filename = Str::slug($tournament->title ?: 'tournoi').'-logos-top-12.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    private function html(Tournament $tournament, $teams): string
    {
        $generatedAt = now()->format('d/m/Y H:i');
        $registrationEnd = data_get($tournament->rules, 'calendar_slot.ends_at');
        $registrationEndLabel = $registrationEnd ? date('d/m/Y H:i', strtotime((string) $registrationEnd)) : 'Non renseignee';
        $teamsHtml = $teams->map(fn (TournamentTeam $team) => $this->teamHtml($team))->implode('');

        return '<!doctype html><html><head><meta charset="utf-8"><style>'.$this->css().'</style></head><body>'
            .'<header class="cover">'
            .'<p class="eyebrow">Astral4Gamer - Rapport inscriptions</p>'
            .'<h1>'.$this->e($tournament->title).'</h1>'
            .'<div class="meta"><span>Equipes inscrites: <strong>'.$teams->count().'</strong></span><span>Fin inscriptions: <strong>'.$this->e($registrationEndLabel).'</strong></span><span>Genere le: <strong>'.$this->e($generatedAt).'</strong></span></div>'
            .'</header>'
            .($teams->isEmpty() ? '<section class="empty">Aucune equipe inscrite pour le moment.</section>' : $teamsHtml)
            .'</body></html>';
    }

    private function teamHtml(TournamentTeam $team): string
    {
        $metadata = $team->metadata ?? [];
        $members = collect($metadata['members'] ?? []);
        $logo = $this->safeImage((string) ($metadata['logo'] ?? ''));
        $country = (string) ($metadata['country'] ?? 'Non renseigne');
        $status = $this->statusLabel((string) $team->status);
        $createdAt = $team->created_at?->format('d/m/Y H:i') ?? 'Non renseigne';
        $membersHtml = $members->map(fn ($member) => $this->memberRow((array) $member))->implode('');

        return '<section class="team">'
            .'<div class="team-head">'
            .'<div class="logo">'.($logo ? '<img src="'.$this->e($logo).'" alt="Logo '.$this->e($team->name).'">' : $this->e(Str::upper(Str::substr($team->name, 0, 2)))).'</div>'
            .'<div><h2>'.$this->e($team->name).'</h2><p>'.$this->e($country).' - '.$this->e($createdAt).' - '.$this->e($status).'</p></div>'
            .'</div>'
            .'<table><thead><tr><th>Role</th><th>Joueur</th><th>UID</th><th>Niveau</th><th>Region</th><th>Verification</th></tr></thead><tbody>'
            .($membersHtml ?: '<tr><td colspan="6">Aucun joueur renseigne.</td></tr>')
            .'</tbody></table>'
            .'</section>';
    }

    private function qualifiedHtml(Tournament $tournament, $qualifiedTeams): string
    {
        $generatedAt = now()->format('d/m/Y H:i');
        $teamsHtml = collect($qualifiedTeams)->map(fn (array $team) => $this->qualifiedTeamHtml($team))->implode('');

        return '<!doctype html><html><head><meta charset="utf-8"><style>'.$this->qualifiedCss().'</style></head><body>'
            .'<header class="hero">'
            .'<p class="eyebrow">Astral4Gamer - Phase finale</p>'
            .'<h1>Top 12 qualifies</h1>'
            .'<p class="subtitle">'.$this->e($tournament->title).'</p>'
            .'<div class="meta"><span>Equipes qualifiees: <strong>'.collect($qualifiedTeams)->count().'</strong></span><span>Genere le: <strong>'.$this->e($generatedAt).'</strong></span></div>'
            .'</header>'
            .'<section class="notice"><strong>Qualification officielle:</strong> les 12 premieres equipes du classement general sont selectionnees pour la phase finale.</section>'
            .'<main class="grid">'.$teamsHtml.'</main>'
            .'</body></html>';
    }

    private function qualifiedTeamHtml(array $team): string
    {
        $logo = $this->safeImage((string) ($team['logo'] ?? ''));
        $members = collect($team['members'] ?? [])->take(5)->map(function ($member) {
            $name = (string) ($member['nickname'] ?? $member['name'] ?? 'Joueur');
            return '<span>'.$this->e($name).'</span>';
        })->implode('');

        return '<article class="qualified-card">'
            .'<div class="rank">#'.(int) $team['rank'].'</div>'
            .'<div class="logo">'.($logo ? '<img src="'.$this->e($logo).'" alt="Logo '.$this->e((string) $team['name']).'">' : $this->e($this->initials((string) $team['name']))).'</div>'
            .'<div class="content">'
            .'<h2>'.$this->e((string) $team['name']).'</h2>'
            .'<p class="points">'.(int) $team['total_points'].' pts</p>'
            .'<div class="split"><span>Phase 1: <strong>'.(int) $team['phase_1_points'].'</strong></span><span>B x C: <strong>'.(int) $team['phase_2_points'].'</strong></span></div>'
            .'<div class="members">'.($members ?: '<span>Roster a confirmer</span>').'</div>'
            .'</div>'
            .'</article>';
    }

    private function qualifiedLogosHtml($qualifiedTeams): string
    {
        $logosHtml = collect($qualifiedTeams)->map(fn (array $team) => $this->qualifiedLogoHtml($team))->implode('');

        return '<!doctype html><html><head><meta charset="utf-8"><style>'.$this->qualifiedLogosCss().'</style></head><body>'
            .'<main class="logo-grid">'.$logosHtml.'</main>'
            .'</body></html>';
    }

    private function qualifiedLogoHtml(array $team): string
    {
        $logo = $this->safeImage((string) ($team['logo'] ?? ''));

        return '<div class="logo-only">'
            .($logo ? '<img src="'.$this->e($logo).'" alt="">' : '<span>'.$this->e($this->initials((string) $team['name'])).'</span>')
            .'</div>';
    }

    private function qualifiedTeams(Tournament $tournament, $teams)
    {
        $configured = collect(data_get($tournament->rules, 'qualified_teams', []));
        $teamsByName = $teams->keyBy(fn (TournamentTeam $team) => $this->normalizeName($team->name));

        if ($configured->isNotEmpty()) {
            return $configured->values()->take(12)->map(function ($item, int $index) use ($teamsByName) {
                $row = is_array($item) ? $item : ['name' => (string) $item];
                $name = (string) ($row['name'] ?? 'Equipe');
                $normalizedName = $this->normalizeName($name);
                $team = $teamsByName->get($normalizedName) ?? $teamsByName->first(function (TournamentTeam $candidate, string $candidateName) use ($normalizedName) {
                    return $normalizedName !== '' && (str_starts_with($candidateName, $normalizedName) || str_starts_with($normalizedName, $candidateName));
                });
                $metadata = $team?->metadata ?? [];

                return [
                    'rank' => (int) ($row['rank'] ?? $index + 1),
                    'name' => $team?->name ?? $name,
                    'phase_1_points' => (int) ($row['phase_1_points'] ?? 0),
                    'phase_2_points' => (int) ($row['phase_2_points'] ?? 0),
                    'total_points' => (int) ($row['total_points'] ?? $team?->points ?? 0),
                    'logo' => $metadata['logo'] ?? $row['logo'] ?? '',
                    'members' => $metadata['members'] ?? [],
                ];
            });
        }

        return $teams
            ->sortByDesc(fn (TournamentTeam $team) => [(int) $team->points, (int) $team->kills])
            ->values()
            ->take(12)
            ->map(fn (TournamentTeam $team, int $index) => [
                'rank' => $index + 1,
                'name' => $team->name,
                'phase_1_points' => 0,
                'phase_2_points' => 0,
                'total_points' => (int) $team->points,
                'logo' => $team->metadata['logo'] ?? '',
                'members' => $team->metadata['members'] ?? [],
            ]);
    }

    private function memberRow(array $member): string
    {
        return '<tr>'
            .'<td>'.$this->e((string) ($member['role'] ?? '')).'</td>'
            .'<td>'.$this->e((string) ($member['nickname'] ?? '')).'</td>'
            .'<td>'.$this->e((string) ($member['uid'] ?? '')).'</td>'
            .'<td>'.$this->e((string) ($member['level'] ?? '')).'</td>'
            .'<td>'.$this->e((string) ($member['region'] ?? '')).'</td>'
            .'<td>'.(! empty($member['verified']) ? 'Verifie' : 'Non verifie').'</td>'
            .'</tr>';
    }

    private function safeImage(string $value): string
    {
        if (str_starts_with($value, 'data:image/')) {
            return $this->thumbnailDataUri($value) ?: (strlen($value) <= 650000 ? $value : '');
        }

        if (str_starts_with($value, 'https://') || str_starts_with($value, 'http://')) {
            return $value;
        }

        return '';
    }

    private function normalizeName(string $value): string
    {
        return Str::of($value)->ascii()->lower()->replaceMatches('/[^a-z0-9]+/', '')->toString();
    }

    private function initials(string $name): string
    {
        $parts = collect(preg_split('/\s+/', trim($name)) ?: [])->filter()->values();

        if ($parts->isEmpty()) {
            return 'A4';
        }

        if ($parts->count() === 1) {
            return Str::upper(Str::substr((string) $parts->first(), 0, 2));
        }

        return Str::upper(Str::substr((string) $parts->get(0), 0, 1).Str::substr((string) $parts->get(1), 0, 1));
    }

    private function thumbnailDataUri(string $value): string
    {
        if (! function_exists('imagecreatefromstring')) {
            return '';
        }

        if (! preg_match('/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/', $value, $matches)) {
            return '';
        }

        $binary = base64_decode($matches[1], true);
        if ($binary === false) {
            return '';
        }

        $source = @imagecreatefromstring($binary);
        if (! $source) {
            return '';
        }

        $width = imagesx($source);
        $height = imagesy($source);
        if ($width <= 0 || $height <= 0) {
            imagedestroy($source);
            return '';
        }

        $size = 160;
        $scale = min($size / $width, $size / $height);
        $targetWidth = max(1, (int) floor($width * $scale));
        $targetHeight = max(1, (int) floor($height * $scale));
        $canvas = imagecreatetruecolor($size, $size);
        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefilledrectangle($canvas, 0, 0, $size, $size, $white);
        imagecopyresampled($canvas, $source, (int) floor(($size - $targetWidth) / 2), (int) floor(($size - $targetHeight) / 2), 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        imagejpeg($canvas, null, 82);
        $thumbnail = ob_get_clean();

        imagedestroy($source);
        imagedestroy($canvas);

        return $thumbnail ? 'data:image/jpeg;base64,'.base64_encode($thumbnail) : '';
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'approved', 'validated' => 'Validee',
            'pending_validation' => 'En attente de validation',
            'pending_payment' => 'En attente de paiement',
            'rejected' => 'Refusee',
            default => $status,
        };
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function css(): string
    {
        return 'body{font-family:"DejaVu Sans",sans-serif;margin:0;color:#121722;background:#fff;font-size:11px}.cover{background:#0b1020;color:#fff;padding:28px 32px 24px;border-bottom:5px solid #e50914}.eyebrow{margin:0 0 8px;text-transform:uppercase;letter-spacing:.08em;color:#fca5a5;font-size:10px;font-weight:700}h1{margin:0;font-size:25px;line-height:1.15}.meta{margin-top:16px;display:block}.meta span{display:inline-block;margin:0 14px 6px 0;color:#d8deea}.team{page-break-inside:avoid;margin:18px 24px;border:1px solid #dfe4ed;border-radius:10px;overflow:hidden}.team-head{display:table;width:100%;background:#f7f8fb;border-bottom:1px solid #dfe4ed}.logo{display:table-cell;width:72px;height:72px;text-align:center;vertical-align:middle;background:#111827;color:#fff;font-size:20px;font-weight:800}.logo img{max-width:72px;max-height:72px;object-fit:cover}.team-head div:last-child{display:table-cell;vertical-align:middle;padding:12px 14px}.team h2{margin:0 0 5px;font-size:17px;color:#101827}.team p{margin:0;color:#667085}table{width:100%;border-collapse:collapse}th{background:#fff;color:#667085;text-transform:uppercase;font-size:9px;letter-spacing:.04em;text-align:left}th,td{padding:8px 10px;border-bottom:1px solid #edf0f5;vertical-align:top}td{color:#1f2937}.empty{margin:24px;padding:18px;border:1px solid #dfe4ed;border-radius:10px;color:#667085}';
    }

    private function qualifiedCss(): string
    {
        return 'body{font-family:"DejaVu Sans",sans-serif;margin:0;background:#f4f6fb;color:#101827}.hero{background:#090f1f;color:#fff;padding:30px 34px;border-bottom:6px solid #e50914}.eyebrow{margin:0 0 8px;text-transform:uppercase;letter-spacing:.1em;color:#fca5a5;font-size:10px;font-weight:800}h1{margin:0;font-size:34px;line-height:1.05}.subtitle{margin:8px 0 0;color:#dbe3f1;font-size:14px}.meta{margin-top:18px}.meta span{display:inline-block;margin-right:18px;color:#cbd5e1;font-size:11px}.notice{margin:18px 24px;padding:13px 16px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;font-size:12px}.grid{padding:0 18px 20px}.qualified-card{page-break-inside:avoid;display:table;width:100%;margin:10px 0;border:1px solid #dce3ef;border-radius:12px;background:#fff;overflow:hidden}.rank{display:table-cell;width:54px;text-align:center;vertical-align:middle;background:#111827;color:#fff;font-size:19px;font-weight:900}.logo{display:table-cell;width:76px;height:76px;text-align:center;vertical-align:middle;background:#f8fafc;color:#111827;font-size:22px;font-weight:900}.logo img{max-width:76px;max-height:76px;object-fit:cover}.content{display:table-cell;vertical-align:middle;padding:12px 14px}.content h2{margin:0;font-size:18px;line-height:1.2}.points{margin:4px 0 7px;color:#dc2626;font-size:17px;font-weight:900}.split{font-size:10px;color:#475569}.split span{display:inline-block;margin-right:14px}.members{margin-top:8px;color:#64748b;font-size:9px}.members span{display:inline-block;margin:0 8px 4px 0;padding:3px 6px;border-radius:999px;background:#eef2f7}';
    }

    private function qualifiedLogosCss(): string
    {
        return '@page{margin:24px}body{font-family:"DejaVu Sans",sans-serif;margin:0;background:#fff;color:#111827}.logo-grid{display:block;font-size:0}.logo-only{display:inline-block;width:31%;height:150px;margin:1.1%;text-align:center;vertical-align:middle}.logo-only img{max-width:140px;max-height:140px;object-fit:contain}.logo-only span{display:inline-block;width:138px;height:138px;line-height:138px;border:1px solid #d1d5db;border-radius:18px;background:#f8fafc;color:#111827;font-size:34px;font-weight:900;text-align:center}';
    }
}