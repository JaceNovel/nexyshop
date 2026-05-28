<article>
    <p><strong>{{ $tournament->title }}</strong> vient de livrer une finale intense sur {{ $tournament->mode }}. La competition a reuni les meilleures equipes NEXY autour d un objectif simple : prendre le Booyah et repartir avec les recompenses.</p>

    <h2>Resume du tournoi</h2>
    <p>La finale s est jouee le {{ optional($tournament->starts_at)->format('d/m/Y') }} avec un prize pool de {{ number_format((float) $tournament->prize_pool, 0, ',', ' ') }} XOF. Les rotations, les calls de zone et les duels de fin de partie ont fait la difference.</p>

    <h2>Classement final</h2>
    <ol>
        @foreach ($topTeams as $team)
            <li><strong>{{ $team->name }}</strong> - {{ $team->points }} points, {{ $team->kills }} kills</li>
        @endforeach
    </ol>

    <h2>MVP</h2>
    <p>{{ $mvp?->name ?? 'Le MVP sera confirme par les admins NEXY' }} signe la performance la plus marquante avec une pression constante et des eliminations decisives.</p>

    <h2>Meilleurs moments</h2>
    <p>Au total, {{ $kills }} kills ont ete comptabilises. Les highlights et le replay complet seront ajoutes sur la plateforme des leur validation.</p>

    <p><a href="/replays">Voir les replays</a> | <a href="/category/top-up">Acheter des diamants Free Fire</a> | <a href="/tournois">Participer au prochain tournoi</a></p>
</article>
