import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('🚀 [SEED] Iniciando aprovisionamiento del Tenant Escolar Oficial bajo Pixy Agency...');

    // 1. Identificar la Organización Plataforma: Pixy Agency
    const platformOrgId = 'db9d1288-80ab-48df-b130-a0739881c6f2';
    const adminUserId = 'c3b2058f-487c-442f-a9a0-c1c7d3fb0883';
    const adminEmail = 'mywebsandapps@gmail.com';

    console.log(`✅ [1/9] Plataforma Administradora: "Pixy Agency" (${platformOrgId})`);
    console.log(`✅ [2/9] Administrador de Plataforma: ${adminEmail} (${adminUserId})`);

    // 2. Crear o actualizar el Tenant Escolar: "Colegio Bilingüe San Mateo 2026"
    const schoolOrgId = 'a1111111-2222-3333-4444-555555555555';
    const { error: orgErr } = await supabase
        .from('organizations')
        .upsert({
            id: schoolOrgId,
            name: 'Colegio Bilingüe San Mateo 2026',
            slug: 'colegio-san-mateo',
            organization_type: 'client',
            parent_organization_id: platformOrgId,
            owner_id: adminUserId,
            active_app_id: 'app_school_pro',
            base_app_slug: 'school',
            vertical_key: null,
            status: 'active',
            logo_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&h=200&fit=crop&crop=faces',
            branding_custom_config: {
                colors: { primary: '#1e40af', secondary: '#0284c7' }
            }
        }, { onConflict: 'id' });

    if (orgErr) throw new Error(`Error creando organización escolar: ${orgErr.message}`);
    console.log(`✅ [3/9] Tenant Escolar creado y subordinado a Pixy Agency: "Colegio Bilingüe San Mateo 2026"`);

    // 3. Vincular al Administrador de Plataforma como Owner del Colegio
    await supabase
        .from('organization_members')
        .upsert({
            organization_id: schoolOrgId,
            user_id: adminUserId,
            role: 'owner'
        }, { onConflict: 'organization_id, user_id' });
    console.log(`✅ [4/9] Admin de Pixy Agency vinculado como Owner del Colegio para gestión directa.`);

    // 4. Crear Usuario Rector Exclusivo (rector@sanmateo.edu.co)
    let rectorUserId: string | null = null;
    const { data: rectorUserCheck } = await supabase.auth.admin.listUsers();
    const existingRector = rectorUserCheck?.users?.find(u => u.email === 'rector@sanmateo.edu.co');

    if (existingRector) {
        rectorUserId = existingRector.id;
    } else {
        const { data: newRector, error: rectorErr } = await supabase.auth.admin.createUser({
            email: 'rector@sanmateo.edu.co',
            password: 'SanMateo2026*',
            email_confirm: true,
            user_metadata: { first_name: 'Dr. Guillermo', last_name: 'Montoya' }
        });
        if (!rectorErr && newRector?.user) {
            rectorUserId = newRector.user.id;
        }
    }

    if (rectorUserId) {
        await supabase
            .from('organization_members')
            .upsert({
                organization_id: schoolOrgId,
                user_id: rectorUserId,
                role: 'owner'
            }, { onConflict: 'organization_id, user_id' });
        console.log(`✅ [5/9] Usuario Rector creado y habilitado: rector@sanmateo.edu.co (Pass: SanMateo2026*)`);
    }

    // 5. Crear Año Lectivo 2026 y 4 Períodos SIEE (Decreto 1290)
    const academicYearId = 'b1111111-2222-3333-4444-555555555555';
    await supabase.from('school_academic_years').upsert({
        id: academicYearId,
        organization_id: schoolOrgId,
        name: 'Año Lectivo 2026',
        code: '2026',
        start_date: '2026-01-15',
        end_date: '2026-11-30',
        status: 'active'
    }, { onConflict: 'id' });

    const period1Id = 'c1111111-2222-3333-4444-555555555555';
    const period2Id = 'c2222222-2222-3333-4444-555555555555';
    await supabase.from('school_periods').upsert([
        { id: period1Id, organization_id: schoolOrgId, academic_year_id: academicYearId, name: '1° Período 2026', period_number: 1, weight_percentage: 25.00, start_date: '2026-01-15', end_date: '2026-04-10', is_grading_open: true, is_closed: false },
        { id: period2Id, organization_id: schoolOrgId, academic_year_id: academicYearId, name: '2° Período 2026', period_number: 2, weight_percentage: 25.00, start_date: '2026-04-13', end_date: '2026-06-19', is_grading_open: false, is_closed: false }
    ], { onConflict: 'id' });

    // 6. Grados, Secciones y Áreas Académicas
    const grade9Id = 'd1111111-2222-3333-4444-555555555555';
    await supabase.from('school_grades').upsert({
        id: grade9Id,
        organization_id: schoolOrgId,
        name: 'Noveno Grado',
        short_name: '9°',
        level: 'secondary',
        order_index: 9
    }, { onConflict: 'id' });

    const section9AId = 'e1111111-2222-3333-4444-555555555555';
    await supabase.from('school_sections').upsert({
        id: section9AId,
        organization_id: schoolOrgId,
        grade_id: grade9Id,
        name: '9°A',
        max_capacity: 35,
        classroom_location: 'Edificio Los Robles - Aula 302'
    }, { onConflict: 'id' });

    const areaMathId = '11111111-aaaa-bbbb-cccc-000000000001';
    const areaLangId = '11111111-aaaa-bbbb-cccc-000000000002';
    const areaSciId = '11111111-aaaa-bbbb-cccc-000000000003';
    const areaSocId = '11111111-aaaa-bbbb-cccc-000000000004';
    const areaEngId = '11111111-aaaa-bbbb-cccc-000000000005';

    await supabase.from('school_academic_areas').upsert([
        { id: areaMathId, organization_id: schoolOrgId, name: 'Matemáticas y Razonamiento Lógico', short_code: 'MAT', order_index: 1 },
        { id: areaLangId, organization_id: schoolOrgId, name: 'Humanidades y Lengua Castellana', short_code: 'ESP', order_index: 2 },
        { id: areaSciId, organization_id: schoolOrgId, name: 'Ciencias Naturales y Biología', short_code: 'CNAT', order_index: 3 },
        { id: areaSocId, organization_id: schoolOrgId, name: 'Ciencias Sociales e Historia', short_code: 'CSOC', order_index: 4 },
        { id: areaEngId, organization_id: schoolOrgId, name: 'Idioma Extranjero: Inglés B2', short_code: 'ENG', order_index: 5 }
    ], { onConflict: 'id' });

    // 7. Docentes de Planta con Tokens de Acceso Directo Cero-Login
    const teacherGarciaId = 'f1111111-2222-3333-4444-555555555555';
    const teacherRodriguezId = 'f2222222-2222-3333-4444-555555555555';

    await supabase.from('organization_staff').upsert([
        {
            id: teacherGarciaId,
            organization_id: schoolOrgId,
            first_name: 'Alberto',
            last_name: 'García',
            email: 'alberto.garcia@sanmateo.edu.co',
            role: 'teacher',
            access_token: 'docente_garcia_2026'
        },
        {
            id: teacherRodriguezId,
            organization_id: schoolOrgId,
            first_name: 'Elena',
            last_name: 'Rodríguez',
            email: 'elena.rodriguez@sanmateo.edu.co',
            role: 'teacher',
            access_token: 'docente_rodriguez_2026'
        }
    ], { onConflict: 'id' });

    const courseMathId = '22222222-aaaa-bbbb-cccc-000000000001';
    const courseLangId = '22222222-aaaa-bbbb-cccc-000000000002';
    await supabase.from('school_courses').upsert([
        { id: courseMathId, organization_id: schoolOrgId, section_id: section9AId, area_id: areaMathId, subject_name: 'Álgebra y Trigonometría', lead_teacher_id: teacherGarciaId, weekly_hours: 5, area_weight_percentage: 100 },
        { id: courseLangId, organization_id: schoolOrgId, section_id: section9AId, area_id: areaLangId, subject_name: 'Lengua Castellana y Literatura', lead_teacher_id: teacherRodriguezId, weekly_hours: 4, area_weight_percentage: 100 }
    ], { onConflict: 'id' });
    console.log(`✅ [6/9] Malla curricular y docentes con tokens configurados.`);

    // 8. Estudiantes Matriculados, Carnets QR y Facturas de Pensión
    const studentsData = [
        { id: '33333333-aaaa-bbbb-cccc-000000000001', code: 'EST-2026-001', first: 'Sofía Valentina', last: 'Castro', token: 'estudiante_sofia_2026', rh: 'O+', eps: 'Sura', phone: '3157894561' },
        { id: '33333333-aaaa-bbbb-cccc-000000000002', code: 'EST-2026-002', first: 'Mateo Alejandro', last: 'Gómez', token: 'estudiante_mateo_2026', rh: 'A+', eps: 'Sanitas', phone: '3104561234' },
        { id: '33333333-aaaa-bbbb-cccc-000000000003', code: 'EST-2026-003', first: 'Valentina', last: 'Ríos Ospina', token: 'estudiante_valentina_2026', rh: 'B+', eps: 'Compensar', phone: '3209876543' }
    ];

    for (const st of studentsData) {
        await supabase.from('leads').upsert({
            id: st.id,
            organization_id: schoolOrgId,
            name: `${st.first} ${st.last}`.trim(),
            email: `${st.code.toLowerCase()}@sanmateo.edu.co`,
            phone: st.phone,
            status: 'client',
            contact_type: 'client',
            metadata: {
                blood_type: st.rh,
                eps: st.eps,
                student_code: st.code,
                emergency_phone: st.phone
            }
        }, { onConflict: 'id' });

        const enrollmentId = `44444444-aaaa-bbbb-cccc-${st.code.slice(-12)}`;
        await supabase.from('school_enrollments').upsert({
            id: enrollmentId,
            organization_id: schoolOrgId,
            student_id: st.id,
            academic_year_id: academicYearId,
            section_id: section9AId,
            student_code: st.code,
            status: 'active',
            qr_access_token: st.token
        }, { onConflict: 'id' });

        // Pensiones Wompi
        await supabase.from('school_tuition_invoices').upsert([
            {
                enrollment_id: enrollmentId,
                organization_id: schoolOrgId,
                concept: 'Pensión Escolar - Marzo 2026',
                period_month: '2026-03',
                amount: 450000,
                due_date: '2026-03-05',
                status: 'paid',
                paid_at: '2026-03-04T10:00:00Z'
            },
            {
                enrollment_id: enrollmentId,
                organization_id: schoolOrgId,
                concept: 'Pensión Escolar - Abril 2026',
                period_month: '2026-04',
                amount: 450000,
                due_date: '2026-04-05',
                status: st.code === 'EST-2026-001' ? 'paid' : 'pending',
                paid_at: st.code === 'EST-2026-001' ? '2026-04-02T15:30:00Z' : null
            }
        ], { onConflict: 'enrollment_id, period_month' });
    }
    console.log(`✅ [7/9] Estudiantes con carnet QR y pensiones creados.`);

    // 9. Calificaciones Decreto 1290 e Insignias de Honor
    const assignmentId = '55555555-aaaa-bbbb-cccc-000000000001';
    await supabase.from('school_assignments').upsert({
        id: assignmentId,
        organization_id: schoolOrgId,
        course_id: courseMathId,
        period_id: period1Id,
        title: 'Taller Evaluativo 1: Ecuaciones y Funciones',
        competency_standard: 'Modela situaciones mediante sistemas de ecuaciones',
        weight_percentage: 25,
        due_date: '2026-02-28',
        week_number: 5
    }, { onConflict: 'id' });

    const scores = [4.9, 4.3, 3.6];
    for (let i = 0; i < studentsData.length; i++) {
        const enrollmentId = `44444444-aaaa-bbbb-cccc-${studentsData[i].code.slice(-12)}`;
        await supabase.from('school_grades_records').upsert({
            enrollment_id: enrollmentId,
            assignment_id: assignmentId,
            organization_id: schoolOrgId,
            score: scores[i],
            feedback: scores[i] >= 4.6 ? 'Desempeño Superior: Dominio completo de la competencia.' : 'Desempeño Alto.'
        }, { onConflict: 'enrollment_id, assignment_id' });
    }

    const badgeGoldId = '66666666-aaaa-bbbb-cccc-000000000001';
    await supabase.from('school_badges_catalog').upsert({
        id: badgeGoldId,
        organization_id: schoolOrgId,
        name: 'Genio de las Matemáticas',
        description: 'Excelencia y liderazgo en pensamiento lógico-matemático',
        category: 'academic',
        tier: 'gold',
        beam_color: '#eab308'
    }, { onConflict: 'id' });

    const sofiaEnrollmentId = `44444444-aaaa-bbbb-cccc-${studentsData[0].code.slice(-12)}`;
    await supabase.from('school_awarded_badges').upsert({
        organization_id: schoolOrgId,
        enrollment_id: sofiaEnrollmentId,
        badge_id: badgeGoldId,
        period_id: period1Id,
        awarded_by_teacher_id: teacherGarciaId,
        justification: 'Primer puesto en las Olimpiadas Regionales de Matemáticas'
    }, { onConflict: 'enrollment_id, badge_id' });

    console.log(`✅ [8/9] Calificaciones y Muro de Insignias poblados.`);
    console.log(`✅ [9/9] Sincronización completada exitosamente.`);

    console.log('\n================================================================');
    console.log('🏫 TENANT ESCOLAR APROVISIONADO EXITOSAMENTE');
    console.log('================================================================');
    console.log(`• Institución:        Colegio Bilingüe San Mateo 2026`);
    console.log(`• ID Organización:    ${schoolOrgId}`);
    console.log(`• Plataforma Padre:   Pixy Agency (${platformOrgId})`);
    console.log(`• Gestionable por:    ${adminEmail}`);
    console.log('----------------------------------------------------------------');
    console.log('👤 CREDENCIALES DE ACCESO:');
    console.log(`• Cuenta Admin:       ${adminEmail} (Tu cuenta de Pixy Agency)`);
    console.log(`• Cuenta Rector:      rector@sanmateo.edu.co`);
    console.log(`• Contraseña Rector:  SanMateo2026*`);
    console.log('----------------------------------------------------------------');
    console.log('🔗 ENLACES DE ACCESO DIRECTO PARA REVISAR LA UI:');
    console.log(`1. Dashboard Escolar (Rector): http://localhost:3000/school`);
    console.log(`2. Portal Docente (Prof. Alberto): http://localhost:3000/portal/teacher/docente_garcia_2026`);
    console.log(`3. Portal Estudiantil (Sofía Castro): http://localhost:3000/portal/student/estudiante_sofia_2026`);
    console.log(`4. Portal Estudiantil (Mateo Gómez): http://localhost:3000/portal/student/estudiante_mateo_2026`);
    console.log('================================================================\n');
}

seed().then(() => process.exit(0)).catch(err => {
    console.error('❌ Error en el seed:', err);
    process.exit(1);
});
