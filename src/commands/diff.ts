import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Args, Command, Flags } from '@oclif/core';
import { diffExports, hasChanges } from '../core/diff.js';
import { loadGtmExport } from '../core/parser.js';
import { renderConsole } from '../reporters/console.js';
import { renderHtml } from '../reporters/html.js';
import { renderMarkdown } from '../reporters/markdown.js';

export default class Diff extends Command {
  static override description =
    'Diff two GTM container exports and report added, removed, and modified entities.';

  static override examples = [
    '<%= config.bin %> <%= command.id %> before.json after.json',
    '<%= config.bin %> <%= command.id %> before.json after.json --format markdown --output diff.md',
    '<%= config.bin %> <%= command.id %> before.json after.json --format html --output diff.html',
    '<%= config.bin %> <%= command.id %> before.json after.json --exit-code  # for CI',
  ];

  static override args = {
    before: Args.string({
      description: 'Path to the "before" GTM JSON export (baseline).',
      required: true,
    }),
    after: Args.string({
      description: 'Path to the "after" GTM JSON export (new version).',
      required: true,
    }),
  };

  static override flags = {
    format: Flags.string({
      char: 'f',
      description: 'Output format.',
      options: ['console', 'markdown', 'html'],
      default: 'console',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Write output to this file instead of stdout.',
    }),
    'no-color': Flags.boolean({
      description: 'Disable ANSI colors in console output.',
      default: false,
    }),
    'exit-code': Flags.boolean({
      description: 'Exit with code 1 when differences are found (useful in CI).',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Diff);

    const [before, after] = await Promise.all([
      loadGtmExport(args.before),
      loadGtmExport(args.after),
    ]);

    const diff = diffExports(before, after, {
      before: basename(args.before),
      after: basename(args.after),
    });

    const rendered = this.render(diff, flags);

    if (flags.output) {
      await writeFile(flags.output, rendered, 'utf8');
      this.log(`Wrote ${flags.format} report to ${flags.output}`);
    } else {
      this.log(rendered);
    }

    if (flags['exit-code'] && hasChanges(diff)) {
      this.exit(1);
    }
  }

  private render(
    diff: ReturnType<typeof diffExports>,
    flags: { format: string; 'no-color': boolean; output?: string | undefined },
  ): string {
    switch (flags.format) {
      case 'markdown':
        return renderMarkdown(diff);
      case 'html':
        return renderHtml(diff);
      case 'console':
      default:
        return renderConsole(diff, {
          color: flags['no-color'] ? false : flags.output ? false : undefined,
        });
    }
  }
}
