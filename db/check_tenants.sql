SELECT slug, name, manual_module_overrides FROM organizations WHERE manual_module_overrides IS NOT NULL AND status != 'deleted';
