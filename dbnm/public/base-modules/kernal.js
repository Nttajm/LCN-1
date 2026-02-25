_reg('kernal', (_, cmd_split) => {
    if (cmd_split[1] === 'i') {
      if (cmd_split[2] === 'nas.min.pkg') {
        y_print('Initializing package installation routine for nas.min.pkg...');
        u_print('Resolving dependencies and preparing system environment...');
        print('Allocating memory buffers and establishing secure connection to package repository...');
        makeLoader(0);
        
        setTimeout(() => {
          g_print('Downloading package metadata and verifying digital signatures...');
          setTimeout(() => {
            g_print('Performing cryptographic hash verification (SHA-256) and integrity validation...');
            setTimeout(() => {
              makeLoader('rm');
              g_print('Decompressing archive and extracting binary components to system directories...');
              print('Creating symbolic links and updating PATH environment variables...');
              setTimeout(() => {
                g_print('Executing post-installation configuration scripts and updating environment variables...');
                print('Registering package hooks and initializing runtime dependencies...');
                setTimeout(() => {
                  g_print('Compiling native extensions and optimizing bytecode for target architecture...');
                  setTimeout(() => {
                    g_print('Package nas.min.pkg has been successfully installed and registered in the system registry!');
                    print('Execute "kernal list" to enumerate all installed package modules.');
                    print('Package installation completed. Total time elapsed: 4.2 seconds.');
                  }, 600);
                }, 700);
              }, 800);
            }, 650);
          }, 700);
        }, 4000);
      }
    } else if (cmd_split[1] === 'list') {
      print('<br> Installed Packages:');
      print(' - nas.min.pkg v1.0.2');
      print(' - system-core v2.1.0');
      print(' - network-utils v1.5.3');
    } else if (cmd_split[1] === 'info') {
      if (cmd_split[2]) {
        const pkg = cmd_split[2];
        print(`<br> Package: ${pkg}`);
        print(' Version: 1.0.2');
        print(' Size: 2.4 MB');
        print(' Status: Installed');
        print(' Dependencies: system-core, network-utils');
      } else {
        e_print('Usage: kernal info <package-name>');
      }
    } else if (cmd_split[1] === 'remove') {
      if (cmd_split[2]) {
        const pkg = cmd_split[2];
        y_print(`Removing package: ${pkg}...`);
        makeLoader(0);
        setTimeout(() => {
          makeLoader('rm');
          g_print(`Package ${pkg} removed successfully.`);
        }, 1500);
      } else {
        e_print('Usage: kernal remove <package-name>');
      }
    } else if (cmd_split[1] === 'update') {
      y_print('Checking for updates...');
      makeLoader(0);
      setTimeout(() => {
        makeLoader('rm');
        g_print('All packages are up to date.');
      }, 1800);
    } else {
      print('<br> Kernal Package Manager');
      print(' Usage:');
      print('   kernal i <package>     - Install a package');
      print('   kernal list            - List installed packages');
      print('   kernal info <package>  - Show package information');
      print('   kernal remove <package> - Remove a package');
      print('   kernal update          - Update all packages');
    }
});