-- Run in the Supabase SQL Editor. Gives the hero a design (dark background, red circle, headline, subtitle).
update site_sections
set content = coalesce(content, '{}'::jsonb) || jsonb_build_object('design', $json$
{
  "version": 1,
  "layouts": {
    "desktop": {
      "width": 1200,
      "height": 600,
      "background": "#0b0b0c",
      "elements": [
        {"id":"dot","type":"shape","shape":"ellipse","position":{"x":820,"y":120},"size":{"width":280,"height":280},"style":{"fill":"#e8281e"}},
        {"id":"title","type":"text","position":{"x":80,"y":180},"size":{"width":700,"height":160},"content":{"text":"Hello from the database"},"style":{"fontFamily":"Archivo","fontSize":72,"fontWeight":800,"color":"#ffffff","lineHeight":1.05}},
        {"id":"sub","type":"text","position":{"x":80,"y":380},"size":{"width":700,"height":60},"content":{"text":"This hero is drawn from site_sections.content.design"},"style":{"fontFamily":"Archivo","fontSize":24,"color":"#cccccc"}}
      ]
    }
  }
}
$json$::jsonb)
where section_key = 'hero';

-- Revert to the built-in hero:
-- update site_sections set content = content - 'design' where section_key = 'hero';
