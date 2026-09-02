; Local scopes and definitions for LALRPOP grammars.
;
; Each alternative introduces a scope. The `<name: Symbol>` bindings declared
; in a production rule are exposed as parameter definitions so that a matching
; identifier used inside the alternative's Rust action block (which is injected
; as Rust) resolves back to this declaration.

; A production alternative is a scope that contains both the `<name: ...>`
; declarations and the `=> { ... }` Rust action that uses them.
(alternative) @local.scope

; `<x: Bar>` and `<mut y: Baz>` declare `x` / `y` as parameters.
(named_symbol
  name: (identifier) @local.definition.parameter)

; `<(a, b): Foo>` tuple bindings also declare names.
(tuple_item
  (identifier) @local.definition.parameter)
