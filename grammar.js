/**
 * @file LALRPOP grammar for tree-sitter
 * @author Mathis Brossier <mathis.brossier@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
	name: "lalrpop",

	rules: {
		// TODO: add the actual grammar rules
		source_file: ($) => "hello",
	},
});
