import { join } from 'path';
import * as shell from 'shelljs';

const projectsRoot = join(__dirname, '../projects');

[1, 3, 4].forEach((value) => {
  it(`Project ${value}`, () => {
    const { code } = shell.exec('npm start', {
      cwd: join(projectsRoot, `project${value}`),
      silent: true,
    });

    expect(code).toEqual(0);
  });
});
