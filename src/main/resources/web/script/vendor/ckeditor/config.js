/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here.
	// For the complete reference:
	// http://docs.ckeditor.com/#!/api/CKEDITOR.config
    config.extraPlugins = 'mathjax,oembed'
    config.filebrowserImageBrowseLinkUrl = '/de.deepamehta.images/browse.html'
    config.filebrowserImageUploadUrl = '/images/upload'
    // is used in "Bild-Info"-Tab to select an already uploaded image
    config.filebrowserImageBrowseUrl = '/de.deepamehta.images/browse.html'
    // config.filebrowserUploadUrl = '/images/upload'

    config.oembed_maxWidth = '560'
    config.oembed_maxHeight = '315'
    config.oembed_WrapperClass = 'embeded'

	// The toolbar groups arrangement, optimized for two toolbar rows.
	config.toolbarGroups = [
        { name: 'others',       groups: [ 'undo','redo' ] },
		// { name: 'clipboard',    groups: [ 'pastetext' ] },
		// { name: 'editing',     groups: [ 'find', 'selection', 'spellchecker' ] },
        { name: 'basicstyles',  groups: [ 'basicstyles', 'cleanup' ] },
        { name: 'links' },
		{ name: 'insert' },
        { name: 'document',     groups: [ 'mode', 'document', 'doctools' ] },
		{ name: 'paragraph',    groups: [ 'list', 'indent', 'blocks', 'align' ] },
		{ name: 'forms' },
		{ name: 'styles' },
		{ name: 'colors' },
        { name: 'tools' },
		{ name: 'about' }
	];

	// Remove some buttons, provided by the standard plugins, which we don't
	// need to have in the Standard(s) toolbar.
	config.removeButtons = 'Underline,Subscript,Superscript';
    config.forcePasteAsPlainText = true;

	// Let's have it basic on dialogs as well.
	config.removeDialogTabs = 'link:advanced';
};
