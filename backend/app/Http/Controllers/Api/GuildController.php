<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guild;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GuildController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'logo_url' => ['nullable', 'url']]);

        return Guild::create([
            ...$data,
            'slug' => Str::slug($data['name']).'-'.Str::random(5),
            'leader_user_id' => $request->user()->id,
        ]);
    }

    public function join(Request $request, Guild $guild)
    {
        return ['joined' => true, 'guild_id' => $guild->id, 'user_id' => $request->user()->id];
    }
}
