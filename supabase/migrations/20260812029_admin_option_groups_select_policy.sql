-- Allow admins with manage_products permission to manage/select option_groups and option_values regardless of product status
DROP POLICY IF EXISTS "Admins with manage_products can manage option_groups" ON option_groups;
CREATE POLICY "Admins with manage_products can manage option_groups" ON option_groups
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_products'))
    WITH CHECK (private.admin_has_permission('manage_products'));

DROP POLICY IF EXISTS "Admins with manage_products can manage option_values" ON option_values;
CREATE POLICY "Admins with manage_products can manage option_values" ON option_values
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_products'))
    WITH CHECK (private.admin_has_permission('manage_products'));
