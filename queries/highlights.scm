; Highlights for LALRPOP grammar files.

; Keywords
[
  "grammar"
  "where"
  "for"
  "extern"
  "enum"
  "type"
  "match"
  "else"
  "if"
  "use"
  "pub"
  "in"
  "mut"
  "dyn"
] @keyword

; Special action / position markers
[
  "=>"
  "=>?"
  "=>@L"
  "=>@R"
  "@L"
  "@R"
] @keyword.operator

; Operators
[
  "="
  ":"
  "::"
  "->"
  "&"
] @operator

"#" @punctuation.special

(condition_op) @operator
(repeat_op) @operator
(error_symbol) @keyword.operator

; Punctuation
[
  ";"
  ","
] @punctuation.delimiter

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
  "<"
  ">"
] @punctuation.bracket

; Nonterminal (rule) definitions
(nonterminal
  name: (nonterminal_name name: (identifier) @function))

(macro_identifier) @function.macro

; Symbol references
(nonterminal_ref (identifier) @type)
(named_symbol name: (identifier) @variable.parameter)

; Types
(nominal_type (path (identifier) @type))
(path (identifier) @type)
(lifetime) @label

; extern enum token conversions: the terminal being mapped is a token type
(conversion
  from: (terminal (identifier) @type))

; Attributes: `#[cfg(feature = "imports")]`
(attribute) @attribute
(shebang_attribute) @attribute
(attribute_inner (identifier) @function.macro)

; Literals
(string_literal) @string
(regex_literal) @string.regexp
(char_literal) @character
(escape) @string.escape

; Comments
(line_comment) @comment
(block_comment) @comment

; Wildcards / catch-alls
"_" @constant.builtin
".." @operator
