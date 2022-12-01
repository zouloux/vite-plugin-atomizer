import path from "path"
import { FileFinder, File } from "@zouloux/files";
import { trailing } from "@zouloux/ecma-core";

interface IAtomizerOptions {
	files					:string[]
	// generateTypeDefinitions	:boolean
}

// FIXME : Check if vite.config.ts is happy with this ...
interface IAtomizerPlugin {
	name:string
	enforce:'pre'
	config ( config?, command? )
	transform ( src?, id ?):Promise<any>
}

export function atomizer ( options:IAtomizerOptions ):IAtomizerPlugin {
	// Default options
	options = Object.assign({}, options)
	if ( typeof options.files === "undefined" )
		options.files = ['less', 'scss', 'sass'].map( ext => `**/*.module.${ext}`)
	else if ( !Array.isArray(options.files) ) {
		throw new Error("atomizer.config // config.files should be array of glob path.")
	}

	let root;
	// Check if a file path matches the config globs
	async function matchFile ( filePath ) {
		for ( const fileGlob of options.files ) {
			const files = await FileFinder.find("file", path.join( root, fileGlob ))
			if ( files.find( f => f.path === filePath) )
				return true;
		}
		return false
	}

	// Transform a css module
	async function transform ( filePath, variableMarker ) {
		// Load less file to atomize
		const file = new File( filePath )
		await file.load()
		// Get each line and trim spaces
		const trimmedLines = (file.content() as string).split("\n")//.map( l => l.trim() )
		// Variables to export are the one starting with the variable marker
		const variables = trimmedLines
			.filter( l => l.indexOf( variableMarker ) === 0 )
			// Skip private members ( starting with an underscore )
			.filter( l => l.indexOf("_") !== 1 )
			.map( line => (
				// Split variable name and value
				line.split(':', 2)
				// Remove comments, commas, and trim spaces
				.map( part => (
					part.split('//', 2)[0].split(';', 2)[0].trim()
				))
			))
			// Only keep assigment statements
			.filter( parts => parts.length === 2 )
		// Get pre-existing export statement line number
		let exportStartLine = trimmedLines
			.map( (line, i) => (line.indexOf(':export') !== -1 ? i : -1) )
			.filter( l => (l !== -1) )[0];
		let exportEndLine = -1;
		let previousExportedLines = []
		if ( exportStartLine == null ) {
			// Not existing so we add at end of file
			trimmedLines.push("")
			exportStartLine = trimmedLines.length - 1;
			exportEndLine = exportStartLine;
		} else {
			// Get end of export statement line number
			trimmedLines.map( (line, i) => {
				if ( exportEndLine >= 0 || i < exportStartLine ) return;
				if ( line.indexOf('}') === -1 ) return;
				exportEndLine = i;
			});
			// Add previously exported variables
			for ( let i = exportStartLine + 1; i < exportEndLine; ++i )
				previousExportedLines.push( "\t" + trailing(trimmedLines[i], true, ";") )
			// TODO : What to do if an variable is already exported ?
		}
		// Generate export statement with all variables
		const exportStatement = [
			':export {',
			...previousExportedLines,
			...variables.map( parts => `\t${parts[0].substr(1, parts[0].length)}: ${parts[0]};` ),
			'}'
		];
		// Browse all existing lines to create new lines with export statement added
		const newLines = [];
		let exportStatementAlreadyDone = false;
		trimmedLines.map( (line, i) => {
			// If we are in pre-existing export statement
			if ( i >= exportStartLine && i <= exportEndLine ) {
				// Only add once (we can have several lines in previous pre-existing statement)
				if ( !exportStatementAlreadyDone ) {
					// Add all export statement lines
					exportStatement.map( exportLine => newLines.push(exportLine) )
					exportStatementAlreadyDone = true;
				}
				return;
			}
			newLines.push( line );
		});
		return newLines.join("\n")
	}

	return {
		name: 'atomizer',
		// Must run before post-css
		enforce: 'pre',
		// Get project root from vite config
		config ( config, command ) {
			root = path.resolve( process.cwd(), config.root )
		},
		async transform ( src, id ) {
			// Remove parameters from id
			id = id.split("?")[0]
			// Catch files matching ones from glob options
			if ( !await matchFile(id) ) return undefined;
			// Get file extension and transform accordingly
			const extension = path.parse( id ).ext.toLowerCase()
			if ( extension === ".less" )
				return await transform( id, '@' );
			else if ( extension === ".scss" || extension === ".sass" )
				return await transform( id, '$' );
			// Generate type definition
			// if ( options.generateTypeDefinitions ) {
			// 	console.log( '>', id );
			// 	process.exit();
			// }
			// This file is not supported
			else
				throw new Error(`atomizer.transform // File type ${extension} not supported yet.`)
		}
	}
}