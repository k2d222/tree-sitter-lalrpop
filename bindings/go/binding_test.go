package tree_sitter_lalrpop_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_lalrpop "github.com/k2d222/tree-sitter-lalrpop/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_lalrpop.Language())
	if language == nil {
		t.Errorf("Error loading LALRPOP grammar")
	}
}
