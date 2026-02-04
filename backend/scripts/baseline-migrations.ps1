
$migrations = @(
    "20251014020802_init_schema",
    "20251014021757_add_shop_model",
    "20251014023152_add_commercial_type",
    "20251014033921_add_tenant_name_to_contract",
    "20251014133825_add_deposit_to_contract",
    "20251014134749_add_activity_log_relations",
    "20251014222540_add_setting_model",
    "20251014223736_add_password_reset",
    "20251015003316_add_unit_fields",
    "20251015214500_add_performance_indexes",
    "20251016030500_add_tenant_profile_fields",
    "20251016034500_add_contract_details"
)

foreach ($migration in $migrations) {
    Write-Host "Marking $migration as applied..."
    npx prisma migrate resolve --applied $migration
}

Write-Host "All migrations marked as applied successfully!"
