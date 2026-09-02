/**
 * @file Tree-sitter grammar for LALRPOP grammar files (*.lalrpop)
 * @author generated
 * @license MIT
 *
 * This grammar is intentionally permissive; its main purpose is syntax
 * highlighting. Rust code embedded in the file (use statements, type
 * references, action code, extern token mappings, etc.) is exposed via
 * named nodes so that a language injection can highlight it as Rust.
 *
 * Suggested injection query (queries/injections.scm):
 *
 *   (use_statement (rust_code) @injection.content
 *     (#set! injection.language "rust"))
 *   (action_code (rust_code) @injection.content
 *     (#set! injection.language "rust"))
 *   (type_ref (rust_code) @injection.content
 *     (#set! injection.language "rust"))
 *   (shebang_attribute (rust_code) @injection.content
 *     (#set! injection.language "rust"))
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "lalrpop",

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  externals: ($) => [
    // Balanced Rust code delimited by matching braces `{ ... }`.
    $._rust_brace_block,
    // Rust code for `=> ...` actions up to (but not including) a `,`, `;`
    // or the enclosing `}` at brace-depth zero.
    $._rust_action_expr,
    // Rust code for `use ...;` up to the terminating `;`.
    $._rust_use_body,
    $.line_comment,
    $.block_comment,
    // Error recovery sentinel.
    $._error_sentinel,
  ],

  word: ($) => $.identifier,

  conflicts: ($) => [
    [$.where_clause, $._type_ref],
    [$.nonterminal_ref, $.terminal],
    [$.macro_identifier, $.nonterminal_ref, $.terminal],
    [$.nonterminal_ref, $.terminal, $.tuple_item],
    [$.type_bound_parameter, $._type_ref],
  ],

  supertypes: ($) => [$._grammar_item, $._symbol, $._type_ref],

  rules: {
    source_file: ($) =>
      repeat(
        choice(
          $.shebang_attribute,
          $.grammar_decl,
          $._grammar_item,
        ),
      ),

    // ---------------------------------------------------------------------
    // Comments
    // ---------------------------------------------------------------------
    // (line_comment / block_comment are provided by the external scanner so
    //  that block comments can nest, but we keep no visible body here.)

    // ---------------------------------------------------------------------
    // Shebang / module attributes:  #![ ... ]
    // ---------------------------------------------------------------------
    shebang_attribute: ($) =>
      seq("#!", "[", alias($._attribute_content, $.rust_code), "]"),

    // ---------------------------------------------------------------------
    // grammar<...>(...) where ... ;
    // ---------------------------------------------------------------------
    grammar_decl: ($) =>
      seq(
        "grammar",
        optional($.type_parameters),
        optional($.grammar_parameters),
        optional($.where_clauses),
        ";",
      ),

    type_parameters: ($) =>
      seq("<", commaSep($.type_parameter), ">"),

    type_parameter: ($) => choice($.lifetime, $.identifier),

    grammar_parameters: ($) =>
      seq("(", commaSep($.grammar_parameter), ")"),

    grammar_parameter: ($) => seq($.identifier, ":", $._type_ref),

    where_clauses: ($) => seq("where", commaSep1($.where_clause)),

    where_clause: ($) =>
      choice(
        seq($.lifetime, ":", plusSep1($.lifetime)),
        seq(optional($.for_all), $._type_ref, ":", $.type_bounds),
      ),

    for_all: ($) =>
      seq("for", "<", commaSep($.type_parameter), ">"),

    type_bounds: ($) => plusSep1($.type_bound),

    type_bound: ($) =>
      choice(
        $.lifetime,
        seq(
          optional($.for_all),
          $.path,
          "(",
          commaSep($._type_ref),
          ")",
          optional(seq("->", $._type_ref)),
        ),
        seq(
          optional($.for_all),
          $.path,
          optional(seq("<", commaSep($.type_bound_parameter), ">")),
        ),
      ),

    type_bound_parameter: ($) =>
      choice(
        $.lifetime,
        $._type_ref,
        seq($.identifier, "=", $._type_ref),
      ),

    // ---------------------------------------------------------------------
    // Grammar items
    // ---------------------------------------------------------------------
    _grammar_item: ($) =>
      choice(
        $.use_statement,
        $.match_token,
        $.extern_token,
        $.nonterminal,
      ),

    // use foo::bar;   (body is Rust)
    use_statement: ($) =>
      seq("use", alias($._rust_use_body, $.rust_code), ";"),

    // ---------------------------------------------------------------------
    // Attributes:  #[ ... ]
    // ---------------------------------------------------------------------
    attribute: ($) =>
      seq("#", "[", $.attribute_inner, "]"),

    attribute_inner: ($) =>
      seq($.identifier, optional($.attribute_arg)),

    attribute_arg: ($) =>
      choice(
        seq("(", commaSep($.attribute_inner), ")"),
        seq("=", $.string_literal),
      ),

    // ---------------------------------------------------------------------
    // Nonterminals (production rules)
    // ---------------------------------------------------------------------
    nonterminal: ($) =>
      seq(
        repeat($.attribute),
        optional($.visibility),
        field("name", $.nonterminal_name),
        optional(seq(":", field("type", $._type_ref))),
        "=",
        field("body", $.alternatives),
      ),

    visibility: ($) =>
      choice(
        seq("pub", "(", optional("in"), $.path, ")"),
        "pub",
      ),

    nonterminal_name: ($) =>
      choice(
        seq(
          field("name", $.macro_identifier),
          "<",
          commaSep(field("parameter", $.identifier)),
          ">",
        ),
        field("name", $.identifier),
        field("name", $.escape),
      ),

    // A macro name is any identifier immediately followed by `<`.
    macro_identifier: ($) => $.identifier,

    alternatives: ($) =>
      choice(
        seq($.alternative, ";"),
        seq("{", commaSep($.alternative), "}", optional(";")),
      ),

    alternative: ($) =>
      choice(
        seq(
          repeat($.attribute),
          repeat1($._symbol),
          optional($.condition),
          optional($.action),
        ),
        seq(
          repeat($.attribute),
          optional($.condition),
          $.action,
        ),
      ),

    condition: ($) =>
      seq(
        "if",
        field("lhs", $.identifier),
        field("op", $.condition_op),
        field("rhs", $.string_literal),
      ),

    condition_op: ($) => choice("==", "!=", "~~", "!~"),

    // ---------------------------------------------------------------------
    // Actions (Rust code)
    // ---------------------------------------------------------------------
    action: ($) =>
      choice(
        "=>@L",
        "=>@R",
        $.action_code,
      ),

    action_code: ($) =>
      seq(
        choice("=>", "=>?"),
        choice(
          alias($._rust_brace_block, $.rust_code),
          alias($._rust_action_expr, $.rust_code),
        ),
      ),

    // ---------------------------------------------------------------------
    // Symbols
    // ---------------------------------------------------------------------
    _symbol: ($) =>
      choice(
        $.named_symbol,
        $.choose_symbol,
        $.tuple_symbol,
        $._symbol0,
      ),

    named_symbol: ($) =>
      seq(
        "<",
        optional("mut"),
        field("name", $.identifier),
        ":",
        $._symbol0,
        ">",
      ),

    choose_symbol: ($) => seq("<", $._symbol0, ">"),

    tuple_symbol: ($) => seq("<", $.tuple, ":", $._symbol0, ">"),

    _symbol0: ($) =>
      choice($._symbol1, $.repeat_symbol),

    repeat_symbol: ($) =>
      prec.left(seq($._symbol0, field("op", $.repeat_op))),

    repeat_op: ($) => choice("+", "*", "?"),

    _symbol1: ($) =>
      choice(
        $.macro_symbol,
        $.terminal,
        $.nonterminal_ref,
        $.group_symbol,
        "@L",
        "@R",
        $.error_symbol,
      ),

    error_symbol: ($) => "!",

    macro_symbol: ($) =>
      prec.dynamic(
        1,
        seq(
          field("name", $.macro_identifier),
          "<",
          commaSep($._symbol),
          ">",
        ),
      ),

    group_symbol: ($) => seq("(", repeat($._symbol), ")"),

    // A nonterminal reference (an ambiguous Id or an escaped `r#..`).
    nonterminal_ref: ($) => choice($.identifier, $.escape),

    tuple: ($) =>
      seq("(", commaSep1($.tuple_item), ")"),

    tuple_item: ($) =>
      choice(
        seq(optional("mut"), $.identifier),
        $.tuple,
      ),

    // ---------------------------------------------------------------------
    // Type references (Rust types)
    // ---------------------------------------------------------------------
    _type_ref: ($) =>
      choice(
        $.tuple_type,
        $.slice_type,
        $.symbol_type,
        $.reference_type,
        $.nominal_type,
        $.fn_type,
        $.path,
        $.lifetime,
      ),

    tuple_type: ($) => seq("(", commaSep($._type_ref), ")"),

    slice_type: ($) => seq("[", $._type_ref, "]"),

    symbol_type: ($) => seq("#", $._symbol, "#"),

    reference_type: ($) =>
      seq("&", optional($.lifetime), optional("mut"), $._type_ref),

    nominal_type: ($) =>
      seq(
        optional("dyn"),
        $.path,
        "<",
        commaSep($._type_ref),
        ">",
      ),

    fn_type: ($) =>
      seq(
        "dyn",
        optional($.for_all),
        $.path,
        "(",
        commaSep($._type_ref),
        ")",
        optional(seq("->", $._type_ref)),
      ),

    path: ($) =>
      seq(
        optional("::"),
        sep1("::", $.identifier),
      ),

    // ---------------------------------------------------------------------
    // extern { ... }
    // ---------------------------------------------------------------------
    extern_token: ($) =>
      seq(
        "extern",
        "{",
        repeat(choice($.associated_type, $.enum_token)),
        "}",
      ),

    associated_type: ($) =>
      seq("type", $.identifier, "=", $._type_ref, ";"),

    enum_token: ($) =>
      seq(
        "enum",
        field("type", $._type_ref),
        "{",
        commaSep($.conversion),
        "}",
      ),

    conversion: ($) =>
      seq(
        repeat($.attribute),
        field("from", $.terminal),
        "=>",
        field("to", $.pattern),
      ),

    // ---------------------------------------------------------------------
    // match { ... }
    // ---------------------------------------------------------------------
    match_token: ($) =>
      seq(
        $.match_block,
        repeat(seq("else", $.match_block)),
      ),

    match_block: ($) =>
      seq("match", "{", commaSep($.match_item), "}"),

    match_item: ($) =>
      choice(
        "_",
        $.match_mapping,
        $.quoted_literal,
      ),

    match_mapping: ($) =>
      seq(field("from", $.quoted_literal), "=>", field("to", $.match_target)),

    match_target: ($) =>
      choice(
        $.terminal,
        seq("{", "}"),
      ),

    // ---------------------------------------------------------------------
    // Patterns (used in enum token conversions)
    // ---------------------------------------------------------------------
    pattern: ($) =>
      choice(
        seq($.path, "(", commaSep($.pattern), ")"),
        seq(
          $.path,
          "{",
          commaSep($.field_pattern),
          optional(seq(optional(","), "..")),
          "}",
        ),
        "_",
        "..",
        seq("<", $._type_ref, ">"),
        seq("(", commaSep($.pattern), ")"),
        $.char_literal,
        $.path,
        $.string_literal,
      ),

    field_pattern: ($) =>
      seq(field("name", $.identifier), ":", $.pattern),

    // ---------------------------------------------------------------------
    // Terminals & literals
    // ---------------------------------------------------------------------
    terminal: ($) =>
      choice($.quoted_literal, $.identifier),

    quoted_literal: ($) =>
      choice($.string_literal, $.regex_literal),

    string_literal: ($) => /"(\\.|[^"\\])*"/,

    regex_literal: ($) => token(seq("r", /"(\\.|[^"\\])*"/)),

    char_literal: ($) => /'(\\.|[^'\\])'/,

    lifetime: ($) => /'[a-zA-Z_][a-zA-Z0-9_]*/,

    // r#foo escaped identifier
    escape: ($) => /r#[a-zA-Z_][a-zA-Z0-9_]*/,

    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Raw content inside an attribute's brackets (highlighted as Rust).
    _attribute_content: ($) => token(prec(-1, /[^\]]*/)),
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sep1(separator, rule) {
  return seq(rule, repeat(seq(separator, rule)));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function plusSep1(rule) {
  return seq(rule, repeat(seq("+", rule)), optional("+"));
}
