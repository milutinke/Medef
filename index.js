const Axios = require('Axios');
const OS = require('os');
const FileSystem = require('fs');
const Colors = require('colors');
const UrlExists = require('url-exists');
const Path = require('path');

var ARGV = require('yargs')
	.usage('Usage: $0 -path [string] -mcversion [string]')
	.demandOption(['path', 'mcversion'])
	.alias('path', 'p')
	.alias('mcversion', 'mcv')
	.describe('path', 'The path where your class file will be generated')
	.describe('mcversion', 'Minecraft version')
	.epilog(`${'Entity Mapping Class Generator for Minecraft Console Client'.cyan}${OS.EOL}${'Made by Dusan Milutinovic'.green} (${'https://github.com/milutinke'.cyan})`)
	.argv;

// Version
const PATH = ARGV.path;
const VERSION = ARGV.mcversion.toString();

// Utilities
const Capitalize = text => text.split(' ').map(part => `${part.charAt(0).toUpperCase()}${part.substring(1)}`).join(' ');
const ReplaceAll = (text, find, replace) => text.replace(new RegExp(find.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
const RemoveSpaces = text => ReplaceAll(text, ' ', '').trim();
const FormatName = text => RemoveSpaces(Capitalize(text));
const FomatVersion = version => ReplaceAll(version, '.', '').trim();
const FormatClassName = version => `EntityPalette${FomatVersion(version)}`;

const GenerateTemplate = (version, class_, values) => `using System;
using System.Collections.Generic;

namespace MinecraftClient.Mapping.EntityPalettes
{
	/// <summary>
	/// Defines mappings for Minecraft ${version}.
	/// Automatically generated using EntityPaletteGenerator.cs
	/// </summary>
	public class ${class_} : EntityPalette
	{
		private static Dictionary<int, EntityType> mappings = new Dictionary<int, EntityType>();

		static ${class_}()
		{
			${values}
		}
	
		protected override Dictionary<int, EntityType> GetDict()
		{
			return mappings;
		}
	}
}
`;

const MappingTemplate = (id, name) => `			mappings[${id}] = EntityType.${FormatName(name)};`;
const FormatUrl = version => `https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/${version}/entities.json`;

// Generation function
(async (path, version) => {
	try {
		const start = new Date();
		const className = `${FormatClassName(version)}`;
		path = Path.join(`${className}.cs`);

		if (FileSystem.existsSync(path)) {
			console.log(`Removed a previously generated file at specified path: ${path.yellow}`.green);
			FileSystem.unlinkSync(path);
		}

		const URL = FormatUrl(version);

		UrlExists(URL, function (error, exists) {
			if (error)
				throw new Error(`Could not contact URL: ${URL}`);
			else if (!exists)
				throw new Error(`No data found for Minecraft version ${version}`);
		});

		console.log(`Obtaining data for Minecraft ${version.cyan} ${'from:'.green} ${URL.yellow}`.green);
		const data = await Axios.get(URL);

		if (!data || (data && !data.data))
			throw new Error(`No data to obtain for Minecraft version ${version}`);

		const values = new Array();
		data.data.forEach(entity => values.push(MappingTemplate(entity.id, entity.displayName)));
		values[0] = values[0].trim();

		FileSystem.writeFileSync(path, GenerateTemplate(version, className, values.join(OS.EOL)));
		console.log(`${'Successfully generated class'.green} ${FormatClassName(version).cyan} ${'-> Path:'.green} ${path.cyan} ${'in'.green} ${(new Date() - start).toString().cyan} ${'ms'.green}`);
	} catch (error) {
		console.log(`ERROR: ${error.message}`.bgRed.white);
	}
})(PATH, VERSION);