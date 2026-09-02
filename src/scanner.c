#include "tree_sitter/parser.h"
#include <wctype.h>

enum TokenType {
  RUST_BRACE_BLOCK,   // { ... } balanced (Rust)
  RUST_ACTION_EXPR,   // Rust expression up to , ; or } at depth 0
  RUST_USE_BODY,      // Rust up to terminating ;
  LINE_COMMENT,
  BLOCK_COMMENT,
  ERROR_SENTINEL,
};

// Whether `c` can appear inside a Rust identifier / raw string prefix etc.
static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }
static void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

// Skip a Rust string / char / raw string literal starting at the current
// character (which is `"` , `'`, or `r`). Returns true if it consumed one.
static bool consume_string_like(TSLexer *lexer) {
  if (lexer->lookahead == '"') {
    advance(lexer);
    while (lexer->lookahead != 0) {
      if (lexer->lookahead == '\\') {
        advance(lexer);
        if (lexer->lookahead != 0) advance(lexer);
        continue;
      }
      if (lexer->lookahead == '"') {
        advance(lexer);
        break;
      }
      advance(lexer);
    }
    return true;
  }
  if (lexer->lookahead == '\'') {
    // Could be a char literal or a lifetime; treat conservatively as char
    // literal only when it looks like one. Either way just advance one.
    advance(lexer);
    while (lexer->lookahead != 0 && lexer->lookahead != '\'' &&
           lexer->lookahead != '\n') {
      if (lexer->lookahead == '\\') {
        advance(lexer);
        if (lexer->lookahead != 0) advance(lexer);
        continue;
      }
      advance(lexer);
    }
    if (lexer->lookahead == '\'') advance(lexer);
    return true;
  }
  return false;
}

// Skip a comment if present. Returns true if one was consumed.
static bool consume_comment(TSLexer *lexer) {
  if (lexer->lookahead == '/') {
    advance(lexer);
    if (lexer->lookahead == '/') {
      while (lexer->lookahead != 0 && lexer->lookahead != '\n') advance(lexer);
      return true;
    }
    if (lexer->lookahead == '*') {
      advance(lexer);
      unsigned depth = 1;
      while (lexer->lookahead != 0 && depth > 0) {
        if (lexer->lookahead == '/') {
          advance(lexer);
          if (lexer->lookahead == '*') { advance(lexer); depth++; }
        } else if (lexer->lookahead == '*') {
          advance(lexer);
          if (lexer->lookahead == '/') { advance(lexer); depth--; }
        } else {
          advance(lexer);
        }
      }
      return true;
    }
    return false; // a lone '/', caller handles
  }
  return false;
}

static bool scan_brace_block(TSLexer *lexer) {
  // Expect current char to be '{'
  if (lexer->lookahead != '{') return false;
  advance(lexer);
  unsigned depth = 1;
  while (lexer->lookahead != 0) {
    if (lexer->lookahead == '/' ) {
      if (consume_comment(lexer)) continue;
      advance(lexer);
      continue;
    }
    if (lexer->lookahead == '"' || lexer->lookahead == '\'') {
      if (consume_string_like(lexer)) continue;
    }
    if (lexer->lookahead == '{') { depth++; advance(lexer); continue; }
    if (lexer->lookahead == '}') {
      depth--;
      advance(lexer);
      if (depth == 0) {
        lexer->result_symbol = RUST_BRACE_BLOCK;
        return true;
      }
      continue;
    }
    advance(lexer);
  }
  return false;
}

static bool scan_action_expr(TSLexer *lexer) {
  // Consume a Rust expression terminated by , ; or } at bracket-depth 0.
  int paren = 0, bracket = 0, brace = 0;
  bool any = false;
  while (lexer->lookahead != 0) {
    if (lexer->lookahead == '/') {
      if (consume_comment(lexer)) { any = true; continue; }
      advance(lexer); any = true; continue;
    }
    if (lexer->lookahead == '"' || lexer->lookahead == '\'') {
      if (consume_string_like(lexer)) { any = true; continue; }
    }
    if (paren == 0 && bracket == 0 && brace == 0) {
      if (lexer->lookahead == ',' || lexer->lookahead == ';' ||
          lexer->lookahead == '}') {
        break;
      }
    }
    switch (lexer->lookahead) {
      case '(': paren++; break;
      case ')': if (paren > 0) paren--; break;
      case '[': bracket++; break;
      case ']': if (bracket > 0) bracket--; break;
      case '{': brace++; break;
      case '}': if (brace > 0) brace--; break;
    }
    advance(lexer);
    any = true;
  }
  if (any) {
    lexer->result_symbol = RUST_ACTION_EXPR;
    return true;
  }
  return false;
}

static bool scan_use_body(TSLexer *lexer) {
  // Consume everything up to (not including) the terminating ';'.
  bool any = false;
  while (lexer->lookahead != 0) {
    if (lexer->lookahead == '/') {
      if (consume_comment(lexer)) { any = true; continue; }
      advance(lexer); any = true; continue;
    }
    if (lexer->lookahead == '"' || lexer->lookahead == '\'') {
      if (consume_string_like(lexer)) { any = true; continue; }
    }
    if (lexer->lookahead == ';') break;
    advance(lexer);
    any = true;
  }
  if (any) {
    lexer->result_symbol = RUST_USE_BODY;
    return true;
  }
  return false;
}

void *tree_sitter_lalrpop_external_scanner_create(void) { return NULL; }
void tree_sitter_lalrpop_external_scanner_destroy(void *p) { (void)p; }
unsigned tree_sitter_lalrpop_external_scanner_serialize(void *p, char *b) {
  (void)p; (void)b; return 0;
}
void tree_sitter_lalrpop_external_scanner_deserialize(void *p, const char *b,
                                                      unsigned n) {
  (void)p; (void)b; (void)n;
}

bool tree_sitter_lalrpop_external_scanner_scan(void *payload, TSLexer *lexer,
                                               const bool *valid_symbols) {
  (void)payload;

  if (valid_symbols[ERROR_SENTINEL]) {
    // In error-recovery mode, decline to produce external tokens.
    return false;
  }

  // Skip leading whitespace (external tokens are separate from `extras`).
  while (iswspace(lexer->lookahead)) skip(lexer);

  // Standalone comments (also exposed as named nodes via `extras`).
  if ((valid_symbols[LINE_COMMENT] || valid_symbols[BLOCK_COMMENT]) &&
      lexer->lookahead == '/') {
    advance(lexer);
    if (lexer->lookahead == '/') {
      while (lexer->lookahead != 0 && lexer->lookahead != '\n') advance(lexer);
      lexer->result_symbol = LINE_COMMENT;
      return true;
    }
    if (lexer->lookahead == '*') {
      advance(lexer);
      unsigned depth = 1;
      while (lexer->lookahead != 0 && depth > 0) {
        if (lexer->lookahead == '/') {
          advance(lexer);
          if (lexer->lookahead == '*') { advance(lexer); depth++; }
        } else if (lexer->lookahead == '*') {
          advance(lexer);
          if (lexer->lookahead == '/') { advance(lexer); depth--; }
        } else {
          advance(lexer);
        }
      }
      lexer->result_symbol = BLOCK_COMMENT;
      return true;
    }
    return false;
  }

  if (valid_symbols[RUST_BRACE_BLOCK] && lexer->lookahead == '{') {
    return scan_brace_block(lexer);
  }

  if (valid_symbols[RUST_USE_BODY]) {
    return scan_use_body(lexer);
  }

  if (valid_symbols[RUST_ACTION_EXPR]) {
    return scan_action_expr(lexer);
  }

  return false;
}
