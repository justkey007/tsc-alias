import { selectBestProjectPath } from '../src/helpers/path-matcher';

describe('selectBestProjectPath', () => {
  it('should return undefined when dirs list is empty', () => {
    const result = selectBestProjectPath('/app/project/dist', 'project', []);
    expect(result).toBeUndefined();
  });

  it('should select single matching project path', () => {
    const outDir = '/app/my-project/dist';
    const projectDir = 'my-project';
    const dirs = ['/app/my-project/dist/my-project'];

    const result = selectBestProjectPath(outDir, projectDir, dirs);
    expect(result).toBe('/app/my-project/dist/my-project');
  });

  it('should select correct project path when an aliased dependency shares the project folder name', () => {
    const outDir = '/home/user/workspace/services/games/pool/lib';
    const projectDir = 'pool';
    const dirs = [
      '/home/user/workspace/services/games/pool/lib/shared/src/games/pool',
      '/home/user/workspace/services/games/pool/lib/services/games/pool'
    ];

    const result = selectBestProjectPath(outDir, projectDir, dirs);
    expect(result).toBe('/home/user/workspace/services/games/pool/lib/services/games/pool');
  });

  it('should work with Windows backslashes in outDir', () => {
    const outDir = 'C:\\Projects\\services\\games\\pool\\lib';
    const projectDir = 'pool';
    const dirs = [
      'C:/Projects/services/games/pool/lib/shared/src/games/pool',
      'C:/Projects/services/games/pool/lib/services/games/pool'
    ];

    const result = selectBestProjectPath(outDir, projectDir, dirs);
    expect(result).toBe('C:/Projects/services/games/pool/lib/services/games/pool');
  });
});
