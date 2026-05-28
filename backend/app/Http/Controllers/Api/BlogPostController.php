<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\Request;

class BlogPostController extends Controller
{
    public function index(Request $request)
    {
        $query = BlogPost::query()
            ->with('tournament:id,title,mode,status,starts_at', 'replay:id,title,slug,thumbnail_url')
            ->where('status', 'published')
            ->latest('published_at');

        if ($search = $request->query('q')) {
            $query->where(fn ($builder) => $builder
                ->where('title', 'like', "%{$search}%")
                ->orWhere('excerpt', 'like', "%{$search}%")
                ->orWhere('content_html', 'like', "%{$search}%"));
        }

        if ($category = $request->query('category')) {
            $query->where('content_html', 'like', "%{$category}%");
        }

        return response()->json($query->paginate((int) $request->query('per_page', 12)));
    }

    public function show(string $slug)
    {
        $post = BlogPost::query()
            ->with('tournament:id,title,mode,status,starts_at', 'replay:id,title,slug,thumbnail_url')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        return response()->json(['data' => $post]);
    }
}
