<article>
    <p>{{ $replay->description ?? 'Revivez les temps forts de ce replay officiel NEXY.' }}</p>

    <h2>Resume du replay</h2>
    <p>Ce match {{ $replay->category }} met en avant les rotations, les fights decisifs et les performances qui comptent pour la scene Free Fire NEXY.</p>

    @if ($replay->tournament)
        <h2>Tournoi associe</h2>
        <p>{{ $replay->tournament->title }} - {{ $replay->tournament->mode }}</p>
    @endif

    <h2>Meilleurs moments</h2>
    <ul>
        @forelse ($replay->highlights as $highlight)
            <li>{{ $highlight->title }}</li>
        @empty
            <li>Les highlights IA seront ajoutes apres validation admin.</li>
        @endforelse
    </ul>

    <p><a href="/replays/{{ $replay->slug }}">Voir le replay complet</a> | <a href="/tournois">Rejoindre un tournoi NEXY</a></p>
</article>
