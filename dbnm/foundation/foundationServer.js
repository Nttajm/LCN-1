/**
 * foundationServer — LCN foundation server defaults for the database manager.
 * Default server option · free to use · linked via database server default.
 */
const foundationServer = {
    name: 'foundationServer',
    version: '1.0.0',
    desc: 'LCN foundation server · free to use',
    type: 'foundation',
    server: {
        type: 'foundation',
        label: 'LCN Foundation Server',
        desc: 'free to use · foundationServer.js',
        vars: {
            provider: 'foundation',
            source: 'foundation/foundationServer.js',
            firebaseConfig: {
                apiKey: 'AIzaSyDS2IY0dLqq5ClToEg3DwIc493GC2v9epE',
                authDomain: 'dbnm-lcn.firebaseapp.com',
                projectId: 'dbnm-lcn',
                storageBucket: 'dbnm-lcn.firebasestorage.app',
                messagingSenderId: '106102379329',
                appId: '1:106102379329:web:58a1edefdfab66481007c0',
                measurementId: 'G-110K9JF2N0'
            }
        }
    }
};

window.foundationServer = foundationServer;

if (typeof registerPkgContents === 'function') {
    registerPkgContents('foundationServer', {
        version: foundationServer.version,
        desc: foundationServer.desc,
        files: [
            { path: 'foundationServer.js', type: 'module' }
        ]
    });
}
