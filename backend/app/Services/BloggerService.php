<?php

namespace App\Services;

use App\Models\ApiLog;
use App\Models\BlogPost;
use App\Models\GoogleAccount;
use App\Models\Replay;
use App\Models\Tournament;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class BloggerService
{
    public function syncPost(BlogPost $post, bool $publish = true): array
    {
        if (! filled(config('services.blogger.blog_id'))) {
            throw new \RuntimeException('BLOGGER_BLOG_ID n est pas configure.');
        }

        $title = $this->englishBloggerTitle($post);
        $content = $this->contentForBlogger($post);
        $labels = $this->englishLabels();

        return $post->blogger_post_id
            ? $this->updatePost($post->blogger_post_id, $title, $content, $labels)
            : $this->createPost($title, $content, $labels, ! $publish);
    }

    public function listBlogs(GoogleAccount $account): array
    {
        $response = Http::withToken($account->access_token)->get('https://www.googleapis.com/blogger/v3/users/self/blogs');
        $this->log('users.self.blogs', $response);
        $response->throw();

        return $response->json('items', []);
    }

    public function createPost(string $title, string $contentHtml, array $labels = [], bool $isDraft = true, ?GoogleAccount $account = null): array
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');

        $response = Http::withToken($account->access_token)->post("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/?isDraft=".($isDraft ? 'true' : 'false'), [
            'kind' => 'blogger#post',
            'blog' => ['id' => $blogId],
            'title' => $title,
            'content' => $contentHtml,
            'labels' => array_values($labels ?: config('services.blogger.labels')),
        ]);
        $this->log('posts.insert', $response, ['title' => $title, 'draft' => $isDraft]);
        $response->throw();

        return $response->json();
    }

    public function updatePost(string $bloggerPostId, string $title, string $contentHtml, array $labels = [], ?GoogleAccount $account = null): array
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');

        $response = Http::withToken($account->access_token)->patch("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/{$bloggerPostId}", [
            'title' => $title,
            'content' => $contentHtml,
            'labels' => array_values($labels ?: config('services.blogger.labels')),
        ]);
        $this->log('posts.patch', $response, ['post_id' => $bloggerPostId]);
        $response->throw();

        return $response->json();
    }

    public function publishPost(string $bloggerPostId, ?GoogleAccount $account = null): array
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');

        $response = Http::withToken($account->access_token)->post("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/{$bloggerPostId}/publish");
        $this->log('posts.publish', $response, ['post_id' => $bloggerPostId]);
        $response->throw();

        return $response->json();
    }

    public function deletePost(string $bloggerPostId, ?GoogleAccount $account = null): void
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');
        $response = Http::withToken($account->access_token)->delete("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/{$bloggerPostId}");
        $this->log('posts.delete', $response, ['post_id' => $bloggerPostId]);
        $response->throw();
    }

    public function getPost(string $bloggerPostId, ?GoogleAccount $account = null): array
    {
        $account ??= $this->publisherAccount();
        $blogId = config('services.blogger.blog_id');
        $response = Http::withToken($account->access_token)->get("https://www.googleapis.com/blogger/v3/blogs/{$blogId}/posts/{$bloggerPostId}");
        $this->log('posts.get', $response, ['post_id' => $bloggerPostId]);
        $response->throw();

        return $response->json();
    }

    public function contentForBlogger(BlogPost $post): string
    {
        $frontendUrl = rtrim((string) config('services.google.frontend_url'), '/');
        $articleUrl = $frontendUrl.'/blog/'.$post->slug;
        $cover = $post->cover_image_url
            ? '<p><img src="'.e($post->cover_image_url).'" alt="" style="max-width:100%;height:auto;border-radius:12px;" /></p>'
            : '';

        $content = $this->englishBloggerContent($post) ?? $this->translateHtmlToEnglish((string) $post->content_html);

        return $cover
            .$content
            .'<hr />'
            .'<p><strong>Astral4Gamer</strong> - Read the original article: <a href="'.e($articleUrl).'">'.e($articleUrl).'</a></p>';
    }

    private function englishBloggerTitle(BlogPost $post): string
    {
        $title = $post->title;

        if (str_contains($title, 'diamants Free Fire')) {
            return 'How to buy Free Fire diamonds quickly and safely';
        }

        if (str_contains($title, 'Pourquoi participer')) {
            return 'Why join online gaming tournaments?';
        }

        if (str_contains($title, 'Revendeur')) {
            return 'NEXYSHOP becomes an authorized Astral4Gamer reseller';
        }

        if (str_contains($title, '800 EUR')) {
            return 'ECS Network x Astral4Gamer: 800 EUR unlocked for the August 1 selective tournament';
        }

        if (str_contains($title, 'Official Partnership Announcement')) {
            return 'ECS Network x Astral4Gamer: Official Partnership Announcement';
        }

        return $this->translateTextToEnglish($title);
    }

    private function englishBloggerContent(BlogPost $post): ?string
    {
        $title = $post->title;

        if (str_contains($title, 'diamants Free Fire')) {
            return '<h2>How to buy Free Fire diamonds quickly and safely</h2>'
                .'<p>Free Fire remains one of the most popular mobile games in the world. Skins, Elite Passes, emotes, characters and special weapons all rely on diamonds to unlock a large part of the premium experience.</p>'
                .'<p>When buying diamonds, players must stay careful. Fake websites, unrealistic free-diamond promises and unreliable sellers can make players lose money or put their account at risk.</p>'
                .'<h3>1. Choose a reliable platform</h3>'
                .'<p>A serious platform clearly displays pack prices, delivery time, payment methods and customer support. Avoid unknown links, suspicious groups and offers that look too good to be true.</p>'
                .'<h3>2. Check your player UID before payment</h3>'
                .'<p>To receive your diamonds, your UID must be correct. Before confirming the purchase, check your player ID, region when required, selected pack and total amount.</p>'
                .'<h3>3. Be careful with free diamonds</h3>'
                .'<p>Most free-diamond offers are not official. Never share your password and never connect your account to suspicious pages.</p>'
                .'<h3>4. Keep payment proof</h3>'
                .'<p>Always keep a payment screenshot, order number or confirmation email. It helps support find your order quickly if you have a question.</p>'
                .'<h3>5. Compare packs before buying</h3>'
                .'<p>Compare the number of diamonds, total price, possible bonuses and delivery time. A small pack is enough for a first test, while a larger pack may be better for a bigger purchase.</p>'
                .'<p>Buying Free Fire diamonds can be fast and simple when you stay cautious. On Astral4Gamer, players can find gaming top-ups, track purchases and enjoy an experience built for gamers.</p>';
        }

        if (str_contains($title, 'Pourquoi participer')) {
            return '<h2>Why join online gaming tournaments?</h2>'
                .'<p>Playing alone is good. Playing with a goal, a team and a reward is even better. Online gaming tournaments have become an essential part of the player experience.</p>'
                .'<h3>1. You improve faster</h3>'
                .'<p>In tournaments, the level is more serious. Players communicate better, take fewer useless risks and play with real strategy. This helps improve positioning, stress management, aim, communication and decision-making.</p>'
                .'<h3>2. You learn to play under pressure</h3>'
                .'<p>When ranking, prize money or rewards are involved, every decision matters. You learn to stay calm in difficult moments and manage end games better.</p>'
                .'<h3>3. You can win rewards</h3>'
                .'<p>Tournaments can offer money, diamonds, gift cards, gaming credits, badges, ranking points or visibility on the platform.</p>'
                .'<h3>4. You build your reputation</h3>'
                .'<p>If you participate often and perform well, other players start recognizing your name. A strong competitive profile can open doors to teams, communities and future events.</p>'
                .'<p>Astral4Gamer supports competitive gaming with tournaments, community events and player-focused tools.</p>';
        }

        if (str_contains($title, 'Revendeur')) {
            return '<h2>Official partnership announcement</h2>'
                .'<p>We are pleased to announce our official partnership with Astral4Gamer, one of the fastest-growing gaming top-up and service platforms.</p>'
                .'<p>Through this collaboration, NEXYSHOP becomes an authorized Astral4Gamer reseller, allowing us to offer our community reliable digital products, fast deliveries and an even better gaming experience.</p>'
                .'<h3>What this partnership brings you</h3>'
                .'<ul><li>Instant top-ups for popular games</li><li>Authentic digital products</li><li>Competitive pricing</li><li>New products added regularly</li><li>Exclusive promotions and offers</li></ul>'
                .'<p>Our goal is to provide the best gaming services while guaranteeing quality, security and speed.</p>'
                .'<p>We warmly thank Astral4Gamer for its trust and look forward to building a long-term partnership together.</p>'
                .'<p>Astral4Gamer: <a href="https://www.astral4gamer.com">https://www.astral4gamer.com</a></p>'
                .'<p><strong>NEXYSHOP - Authorized Astral4Gamer reseller</strong></p>'
                .'<p>Together, we are building the future of gaming.</p>';
        }

        if (str_contains($title, '800 EUR')) {
            return '<h2>ECS Network x Astral4Gamer: 800 EUR unlocked for the launch</h2>'
                .'<p>ECS Network and Astral4Gamer are unlocking 800 EUR for the launch of the major selective tournament scheduled for August 1.</p>'
                .'<p>Registrations are not open yet. Players and teams will be officially notified very soon with the full registration details, rules and next announcements.</p>'
                .'<h3>What the community should remember</h3>'
                .'<ul><li>800 EUR unlocked for the tournament launch</li><li>Major selective tournament planned for August 1</li><li>Registrations are not open yet</li><li>Official notification coming very soon</li><li>A strengthened collaboration between ECS Network and Astral4Gamer</li></ul>'
                .'<p>Stay tuned. Full details, registration terms and the next announcements will be shared soon.</p>';
        }

        if (str_contains($title, 'Official Partnership Announcement')) {
            return '<h2>ECS Network x Astral4Gamer: Official Partnership Announcement</h2>'
                .'<p>ECS Network announces Astral4Gamer as an official partner to support competitive gaming growth across Africa.</p>'
                .'<p>This partnership strengthens community events, esports opportunities, digital rewards and long-term competitive gaming initiatives.</p>'
                .'<p>Read the full announcement and follow upcoming activations on Astral4Gamer.</p>';
        }

        return null;
    }

    private function englishLabels(): array
    {
        return array_values(array_unique(array_filter([
            ...((array) config('services.blogger.labels')),
            'English',
            'Gaming',
            'Esports',
            'Astral4Gamer',
        ])));
    }

    private function translateHtmlToEnglish(string $html): string
    {
        $parts = preg_split('/(<[^>]+>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE);

        if (! is_array($parts)) {
            return $this->translateTextToEnglish($html);
        }

        return collect($parts)
            ->map(fn (string $part) => str_starts_with($part, '<') ? $part : $this->translateTextToEnglish($part))
            ->implode('');
    }

    private function translateTextToEnglish(string $text): string
    {
        if (trim($text) === '') {
            return $text;
        }

        $translated = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        foreach ($this->blogTranslationPairs() as $from => $to) {
            $translated = str_replace($from, $to, $translated);
        }

        $translated = preg_replace('/\b1er\s+ao[uû]t\b/ui', 'August 1', $translated) ?? $translated;
        $translated = preg_replace('/\b(\d+)\s*EUR\s+debloques\b/ui', '$1 EUR unlocked', $translated) ?? $translated;
        $translated = preg_replace('/\b(\d+)\s*EUR\s+débloqués\b/ui', '$1 EUR unlocked', $translated) ?? $translated;
        $translated = preg_replace('/\b(\d+)\s+euros?\b/ui', '$1 EUR', $translated) ?? $translated;
        $translated = preg_replace('/\bInscriptions?\s+pas\s+encore\s+ouvertes?\b/ui', 'Registrations are not open yet', $translated) ?? $translated;
        $translated = preg_replace('/\bRestez\s+connect[eé]s?\b/ui', 'Stay tuned', $translated) ?? $translated;

        return $translated;
    }

    private function blogTranslationPairs(): array
    {
        $pairs = [
            'ECS Network™ × Astral4Gamer: Official Partnership Announcement' => 'ECS Network™ × Astral4Gamer: Official Partnership Announcement',
            'ECS Network™ announces Astral4Gamer as an Official Partner to support competitive gaming growth across Africa.' => 'ECS Network™ announces Astral4Gamer as an Official Partner to support competitive gaming growth across Africa.',
            'Read the full announcement here!' => 'Read the full announcement here!',
            'OFFICIAL PARTNERSHIP ANNOUNCEMENT' => 'OFFICIAL PARTNERSHIP ANNOUNCEMENT',
            'Annonce officielle de partenariat ECS Network™ × Astral4Gamer' => 'ECS Network™ × Astral4Gamer: Official Partnership Announcement',
            'ECS Network™ annonce Astral4Gamer comme partenaire officiel pour soutenir la croissance du gaming compétitif en Afrique.' => 'ECS Network™ announces Astral4Gamer as an Official Partner to support competitive gaming growth across Africa.',
            'Lire l annonce complète ici !' => 'Read the full announcement here!',
            'Lire l\'annonce complète ici !' => 'Read the full announcement here!',
            'Nous sommes heureux d\'annoncer notre partenariat officiel avec' => 'We are pleased to announce our official partnership with',
            'Grâce à cette collaboration' => 'Through this collaboration',
            'Grace a cette collaboration' => 'Through this collaboration',
            'Ce que ce partenariat vous apporte' => 'What this partnership brings you',
            'Recharges instantanées de jeux populaires' => 'Instant top-ups for popular games',
            'Recharges instantanees de jeux populaires' => 'Instant top-ups for popular games',
            'Produits numériques authentiques' => 'Authentic digital products',
            'Produits numeriques authentiques' => 'Authentic digital products',
            'Prix compétitifs' => 'Competitive pricing',
            'Prix competitifs' => 'Competitive pricing',
            'Nouveaux produits ajoutés régulièrement' => 'New products added regularly',
            'Nouveaux produits ajoutes regulierement' => 'New products added regularly',
            'Promotions et offres exclusives' => 'Exclusive promotions and offers',
            'Notre objectif est de vous proposer les meilleurs services gaming tout en garantissant qualité, sécurité et rapidité.' => 'Our goal is to provide the best gaming services while guaranteeing quality, security, and speed.',
            'Notre objectif est de vous proposer les meilleurs services gaming tout en garantissant qualite, securite et rapidite.' => 'Our goal is to provide the best gaming services while guaranteeing quality, security, and speed.',
            'Ensemble, nous construisons l\'avenir du gaming.' => 'Together, we are building the future of gaming.',
            'NEXYSHOP annonce son partenariat officiel avec Astral4Gamer et devient Revendeur Agréé pour proposer des produits gaming fiables, rapides et compétitifs.' => 'NEXYSHOP announces its official partnership with Astral4Gamer and becomes an authorized reseller to offer reliable, fast, and competitive gaming products.',
            'NEXYSHOP annonce son partenariat officiel avec Astral4Gamer et devient Revendeur Agree pour proposer des produits gaming fiables, rapides et competitifs.' => 'NEXYSHOP announces its official partnership with Astral4Gamer and becomes an authorized reseller to offer reliable, fast, and competitive gaming products.',
            'NEXYSHOP annonce son partenariat officiel avec Astral4Gamer et devient Revendeur Agréé pour proposer des products gaming fiables, rapides et compétitifs.' => 'NEXYSHOP announces its official partnership with Astral4Gamer and becomes an authorized reseller to offer reliable, fast, and competitive gaming products.',
            'ECS Network x Astral4Gamer : une annonce majeure pour la scène compétitive' => 'ECS Network x Astral4Gamer: a major announcement for the competitive scene',
            'ECS Network x Astral4Gamer : une annonce majeure pour la scene competitive' => 'ECS Network x Astral4Gamer: a major announcement for the competitive scene',
            'ECS X ASTRALGAMER nous débloqu\'on 800 eur pour le lancement du grand tournois séléctive du 1er Aout' => 'ECS x Astral4Gamer unlocks 800 EUR for the launch of the major selective tournament on August 1',
            'ECS X ASTRALGAMER nous débloquons 800 eur pour le lancement du grand tournois séléctive du 1er Aout' => 'ECS x Astral4Gamer unlocks 800 EUR for the launch of the major selective tournament on August 1',
            '800 EUR débloqués pour le lancement' => '800 EUR unlocked for the launch',
            '800 EUR debloques pour le lancement' => '800 EUR unlocked for the launch',
            'Grand tournoi sélectif du 1er août' => 'Major selective tournament on August 1',
            'Grand tournoi selectif du 1er aout' => 'Major selective tournament on August 1',
            'Ce que la communauté doit retenir' => 'What the community should remember',
            'Ce que la communaute doit retenir' => 'What the community should remember',
            'Inscriptions pas encore ouvertes' => 'Registrations are not open yet',
            'Notification officielle à venir très bientôt' => 'Official notification coming very soon',
            'Notification officielle a venir tres bientot' => 'Official notification coming very soon',
            'Une collaboration renforcée entre ECS Network et Astral4Gamer' => 'A strengthened collaboration between ECS Network and Astral4Gamer',
            'Une collaboration renforcee entre ECS Network et Astral4Gamer' => 'A strengthened collaboration between ECS Network and Astral4Gamer',
            'Restez connectés.' => 'Stay tuned.',
            'Restez connectes.' => 'Stay tuned.',
            'Les détails complets, les modalités d\'inscription et les prochaines annonces seront communiqués bientôt.' => 'Full details, registration terms, and the next announcements will be shared soon.',
            'Les details complets, les modalites d\'inscription et les prochaines annonces seront communiques bientot.' => 'Full details, registration terms, and the next announcements will be shared soon.',
            'Pourquoi participer a des tournois gaming en ligne ?' => 'Why join online gaming tournaments?',
            'Pourquoi participer à des tournois gaming en ligne ?' => 'Why join online gaming tournaments?',
            'Les tournois gaming en ligne permettent de progresser, gagner des recompenses et construire une vraie communaute autour de tes jeux preferes.' => 'Online gaming tournaments help you improve, win rewards, and build a real community around your favorite games.',
            'Les tournois gaming en ligne permettent de progresser, gagner des récompenses et construire une vraie communauté autour de tes jeux préférés.' => 'Online gaming tournaments help you improve, win rewards, and build a real community around your favorite games.',
            'Resultats' => 'Results',
            'Résultats' => 'Results',
            'la meilleure team' => 'the best team',
            'remporte la grande finale' => 'wins the grand final',
            'Classement final' => 'Final ranking',
            'meilleurs moments' => 'best moments',
            'Resume replay' => 'Replay summary',
            'Résumé replay' => 'Replay summary',
            'liens utiles' => 'useful links',
            'Tournois' => 'Tournaments',
            'tournois' => 'tournaments',
            'tournoi' => 'tournament',
            'communauté' => 'community',
            'communaute' => 'community',
            'récompenses' => 'rewards',
            'recompenses' => 'rewards',
            'compétitions' => 'competitions',
            'competitions' => 'competitions',
            'Actualités' => 'News',
            'actualités' => 'news',
            'annonces' => 'announcements',
            'sélective' => 'selective',
            'selective' => 'selective',
            'lancement' => 'launch',
            'bientôt' => 'soon',
            'bientot' => 'soon',
        ];

        uksort($pairs, fn (string $a, string $b) => strlen($b) <=> strlen($a));

        return $pairs;
    }

    public function draftFromTournament(Tournament $tournament, ?int $createdBy = null): BlogPost
    {
        $tournament->loadMissing(['teams' => fn ($query) => $query->orderByDesc('points')->orderByDesc('kills')]);
        $topTeams = $tournament->teams->take(3);
        $winner = $topTeams->first();
        $mvp = $tournament->teams->sortByDesc('kills')->first();
        $kills = $tournament->teams->sum('kills');
        $title = 'Resultats '.$tournament->title.' : '.($winner?->name ?? 'la meilleure team').' remporte la grande finale';

        $content = view('blog.tournament-result', [
            'tournament' => $tournament,
            'topTeams' => $topTeams,
            'winner' => $winner,
            'mvp' => $mvp,
            'kills' => $kills,
        ])->render();

        return BlogPost::query()->updateOrCreate(
            ['slug' => Str::slug($title)],
            [
                'tournament_id' => $tournament->id,
                'title' => $title,
                'excerpt' => "Classement final, MVP et meilleurs moments de {$tournament->title}.",
                'content_html' => $content,
                'status' => 'draft',
                'created_by' => $createdBy,
            ]
        );
    }

    public function draftFromReplay(Replay $replay, ?int $createdBy = null): BlogPost
    {
        $title = 'Replay NEXY : '.$replay->title;
        $content = view('blog.replay-summary', ['replay' => $replay->loadMissing('tournament', 'highlights')])->render();

        return BlogPost::query()->updateOrCreate(
            ['slug' => Str::slug($title)],
            [
                'replay_id' => $replay->id,
                'title' => $title,
                'excerpt' => $replay->description ?: 'Resume replay, highlights et liens utiles.',
                'content_html' => $content,
                'cover_image_url' => $replay->thumbnail_url,
                'status' => 'draft',
                'created_by' => $createdBy,
            ]
        );
    }

    public function publisherAccount(): GoogleAccount
    {
        $account = GoogleAccount::query()
            ->whereJsonContains('scopes', 'https://www.googleapis.com/auth/blogger')
            ->latest()
            ->first();

        if (! $account) {
            throw new \RuntimeException('Aucun compte Google avec le scope Blogger n est connecte.');
        }

        if ($account->token_expires_at?->isPast() && $account->refresh_token) {
            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $account->refresh_token,
                'grant_type' => 'refresh_token',
            ]);
            $this->log('oauth/token', $response, ['grant_type' => 'refresh_token']);
            $response->throw();

            $payload = $response->json();
            $account->update([
                'access_token' => $payload['access_token'],
                'token_expires_at' => now()->addSeconds((int) ($payload['expires_in'] ?? 3600) - 60),
            ]);
        }

        return $account;
    }

    private function log(string $endpoint, Response $response, array $payload = []): void
    {
        ApiLog::create([
            'service' => 'blogger',
            'direction' => 'out',
            'endpoint' => $endpoint,
            'status_code' => $response->status(),
            'payload' => $payload,
            'response' => $response->json() ?: ['body' => Str::limit($response->body(), 1000)],
            'duration_ms' => null,
        ]);
    }
}
