; Language injections for embedded Rust code in LALRPOP grammars.
;
; Every embedded Rust fragment is captured as a `rust_code` leaf node so that
; the injection range is always a concrete, highlightable node.

((rust_code) @injection.content
  (#set! injection.language "rust"))
