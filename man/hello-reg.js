_reg('hello-reg', () => {
    g_print('hello from the dbnm registry!');
    print('This module was installed with: reg i hello-reg');
});

print('<span class="green b">hello-reg</span> loaded — try <span class="light-blue">hello-reg</span>');
