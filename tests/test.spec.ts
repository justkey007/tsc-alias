import { join } from 'path';
import * as shell from 'shelljs';

const projectsRoot = join(__dirname, '../projects');

[1, 3, 4, 5, 6].forEach((value) => {
  it(`Project ${value}`, () => {
    const { code, stderr } = shell.exec('npm start', {
      cwd: join(projectsRoot, `project${value}`),
      silent: true
    });
    if (code !== 0) console.error(stderr);
    expect(code).toEqual(0);
  });
});
