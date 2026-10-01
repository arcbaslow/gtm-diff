import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Args, Command, Errors, Flags } from '@oclif/core';
import { diffExports, hasChanges } from '../core/diff.js';
import { loadGtmExport } from '../core/parser.js';
import { renderConsole } from '../reporters/console.js';
import { renderHtml } from '../reporters/html.js';
import { renderJson } from '../reporters/json.js';
import { renderMarkdown } from '../reporters/markdown.js';
import { coverageNotice, sanitizeLabel } from '../reporters/shared.js';

export default class Diff extends Command {
  static override description =
    'Diff two GTM container exports and report added, removed, and modified entities.';

  static override examples = [
    '<%= config.bin %> <%= command.id %> before.json after.json',
    '<%= config.bin %> <%= command.id %> before.json after.json --format markdown --output diff.md',
    '<%= config.bin %> <%= command.id %> before.json after.json --format html --output diff.html',
    '<%= config.bin %> <%= command.id %> before.json after.json --format json --output diff.json',
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
    details: Flags.boolean({
      description: 'Include full normalized details in Markdown or HTML.',
      default: false,
    }),
    'max-report-bytes': Flags.integer({
      description: 'Bound Markdown comments in UTF-8 bytes (minimum 1024).',
      min: 1024,
    }),
    'artifact-url': Flags.string({
      description: 'HTTPS full-report link for bounded Markdown comments.',
    }),
    strict: Flags.boolean({
      description:
        'Fail with exit 2 before writing a report when containerVersion fields are omitted.',
      default: false,
    }),
    format: Flags.string({
      char: 'f',
      description: 'Output format.',
      options: ['console', 'markdown', 'html', 'json'],
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
      description: 'Exit 1 for differences, 0 for no changes; command errors exit 2.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Diff);
    if (flags.details && !['markdown', 'html'].includes(flags.format)) {
      throw new Error('--details requires --format markdown or html.');
    }
    if (flags['max-report-bytes'] !== undefined && flags.format !== 'markdown') {
      throw new Error('--max-report-bytes requires --format markdown.');
    }
    if (flags['artifact-url'] !== undefined && flags['max-report-bytes'] === undefined) {
      throw new Error('--artifact-url requires --max-report-bytes.');
    }

    // Validate the baseline first so two invalid files always report the same error.
    const before = await loadGtmExport(args.before);
    const after = await loadGtmExport(args.after);

    const diff = diffExports(before, after, {
      before: basename(args.before),
      after: basename(args.after),
    });

    if (flags.strict && diff.omittedFields) throw new Error(coverageNotice(diff));

    const rendered = this.render(diff, flags);

    if (flags.output) {
      await writeFile(flags.output, rendered, 'utf8');
      this.log(`Wrote ${flags.format} report to ${sanitizeLabel(flags.output)}`);
    } else {
      // Bounded Markdown already has a final newline; do not exceed its byte cap.
      this.log(flags['max-report-bytes'] !== undefined ? rendered.slice(0, -1) : rendered);
    }

    if (flags['exit-code'] && hasChanges(diff)) {
      this.exit(1);
    }
  }

  protected override async catch(error: unknown): Promise<void> {
    if (error instanceof Errors.ExitError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    this.error(sanitizeLabel(message), { exit: 2 });
  }

  private render(
    diff: ReturnType<typeof diffExports>,
    flags: {
      format: string;
      'no-color': boolean;
      output?: string | undefined;
      details: boolean;
      'max-report-bytes'?: number | undefined;
      'artifact-url'?: string | undefined;
    },
  ): string {
    switch (flags.format) {
      case 'json':
        return renderJson(diff);
      case 'markdown':
        return renderMarkdown(diff, {
          full: flags.details,
          maxBytes: flags['max-report-bytes'],
          artifactUrl: flags['artifact-url'],
        });
      case 'html':
        return renderHtml(diff, { full: flags.details });
      case 'console':
      default:
        return renderConsole(diff, {
          color: flags['no-color'] ? false : flags.output ? false : undefined,
        });
    }
  }
}
