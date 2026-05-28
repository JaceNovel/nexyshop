<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StreamMarker extends Model
{
    protected $fillable = ['stream_id', 'timestamp_seconds', 'type', 'note', 'created_by', 'processed'];

    protected $casts = ['processed' => 'boolean'];

    public function stream(): BelongsTo
    {
        return $this->belongsTo(Stream::class);
    }
}
