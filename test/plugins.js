var path         = require('path');
var expect       = require('chai').expect;
var should       = require('chai').should();
var avisynth     = require('../main');
var pluginSystem = require('../code/plugin-system');

describe('Plugin system', function() {
    var fakePluginsDir = path.resolve(__dirname, 'plugins');
    var scriptPath = path.resolve(fakePluginsDir, 'colors_rgb.avsi');
    var pluginPath = path.resolve(fakePluginsDir, 'DeDup.dll');
    var textFile   = path.resolve(fakePluginsDir, 'colors_rgb.txt');
    var missing    = path.resolve(fakePluginsDir, 'non-existent.dll');
    var rand = Math.random(); // Guess what, initializing it takes ~260ms for me on Win7.

    it('should be exposed as an avisynth.addPlugin reference', function() {
        avisynth.addPlugin.should.equal(pluginSystem.addPlugin);
    });

    it('should allow adding plugins and getting them later', function() {
        avisynth.addPlugin('foo', function() {});
        expect(pluginSystem.plugins['foo']).to.exist;
        pluginSystem.plugins['foo'].code.should.be.a.function;
    });

    it('should allow plugins to be defined with options', function() {
        var script = new avisynth.Script;
        avisynth.addPlugin('HaveOptions', {}, function() {});
        script.haveOptions.should.be.a.function;
    });

    describe('naming and aliases', function() {
        it('should throw an error if adding a plugin with a name collision', function() {
            avisynth.addPlugin('Bar', function() {});
            avisynth.addPlugin.bind(avisynth, 'baR', function() {}).should.throw();
        });

        it('should throw an error if adding a plugin with a reserved name', function() {
            avisynth.addPlugin.bind(avisynth, 'code', function() {}).should.throw();
            avisynth.addPlugin.bind(avisynth, 'references', function() {}).should.throw();
            avisynth.addPlugin.bind(avisynth, 'load', function() {}).should.throw();
            avisynth.addPlugin.bind(avisynth, 'autoload', function() {}).should.throw();
            avisynth.addPlugin.bind(avisynth, 'allReferences', function() {}).should.throw();
            avisynth.addPlugin.bind(avisynth, 'fullCode', function() {}).should.throw();
        });

        it('should automatically lowercase plugin names, and generate aliases', function() {
            avisynth.addPlugin('FooBar', function() {});
            pluginSystem.plugins['foobar'].aliases.should.deep.equal(['fooBar', 'FooBar']);
        });

        it('should not generate unnecessary aliases', function() {
            avisynth.addPlugin('pluginOne', function() {});
            pluginSystem.plugins['pluginone'].aliases.should.deep.equal(['pluginOne']);
            avisynth.addPlugin('Plugintwo', function() {});
            pluginSystem.plugins['plugintwo'].aliases.should.deep.equal(['Plugintwo']);
            avisynth.addPlugin('pluginthree', function() {});
            pluginSystem.plugins['pluginthree'].aliases.should.deep.equal([]);
        });

        it('should make plugins available as (aliased) Script methods', function() {
            var script = new avisynth.Script;
            avisynth.addPlugin('pluginfour' , function() {});
            avisynth.addPlugin('pluginFive' , function() {});
            avisynth.addPlugin('Pluginsix'  , function() {});
            avisynth.addPlugin('PluginSeven', function() {});
            script.pluginfour.should.be.a.function;
            script.pluginfive.should.equal(script.pluginFive);
            script.pluginsix.should.equal(script.Pluginsix);
            script.pluginseven.should.be.a.function;
            script.pluginSeven.should.be.a.function;
            script.PluginSeven.should.be.a.function;
        });
    });

    describe('loading and autoloading', function() {
        it('should allow plugins to be exposed with "load" requirements', function() {
            var script = new avisynth.Script;
            avisynth.addPlugin('RequireStuff', {
                load: [scriptPath, pluginPath]
            }, function() {});
            script.requireStuff();
            var code = script.fullCode().split('\n');
            code.slice(-3)[0].should.equal('Import("' + scriptPath + '")');
            code.slice(-2)[0].should.equal('LoadPlugin("' + pluginPath + '")');
        });

        it('should allow plugins to be exposed with "autoload" requirements', function() {
            var script = new avisynth.Script;
            avisynth.addPlugin('RequireDir', {
                autoload: [fakePluginsDir]
            }, function() {});
            script.requireDir();
            var code = script.fullCode().split('\n');
            code.slice(-3)[0].should.equal('Import("' + scriptPath + '")');
            code.slice(-2)[0].should.equal('LoadPlugin("' + pluginPath + '")');
        });

        it('should allow "load" and "autoload" to be autocasted to array', function() {
            var script1 = new avisynth.Script;
            avisynth.addPlugin('RequireStuff2', {
                load: scriptPath
            }, function() {});
            script1.requireStuff2();
            var code = script1.fullCode().split('\n');
            code.slice(-2)[0].should.equal('Import("' + scriptPath + '")');
            code.slice(-1)[0].should.equal('');

            var script2 = new avisynth.Script;
            avisynth.addPlugin('RequireDir2', {
                autoload: fakePluginsDir
            }, function() {});
            script2.requireDir2();
            var code = script2.fullCode().split('\n');
            code.slice(-3)[0].should.equal('Import("' + scriptPath + '")');
            code.slice(-2)[0].should.equal('LoadPlugin("' + pluginPath + '")');
            code.slice(-1)[0].should.equal('');
        });
    });

    describe('execution facilities', function() {
        it('should run plugin code when an alias is invoked', function() {
            var script = new avisynth.Script;
            var foo = 'bar'
            avisynth.addPlugin('ClosureTest', function() { foo = 'baz'; });
            script.closureTest();
            foo.should.equal('baz');
        });

        it('should insert code returned from plugin into script', function() {
            var script = new avisynth.Script;
            var code = 'Subtitle("' + rand + '")';
            avisynth.addPlugin('RandomSub', function() { return code; });
            script.randomsub();
            var lines = script.fullCode().split('\n');
            lines.slice(-2)[0].should.equal(code);
            lines.slice(-1)[0].should.equal('');
        });
    });
});