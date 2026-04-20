package com.smartcampus.operations.config;

import com.smartcampus.operations.entity.AuthProvider;
import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@campus.com}")
    private String adminEmail;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByRole(Role.ADMIN)) {
            User admin = User.builder()
                    .fullName("System Administrator")
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .authProvider(AuthProvider.LOCAL)
                    .role(Role.ADMIN)
                    .department("Administration")
                    .isActive(true)
                    .isLocked(false)
                    .twoFactorEnabled(false)
                    .build();

            userRepository.save(admin);
            log.info("========================================");
            log.info("  DEFAULT ADMIN USER CREATED");
            log.info("  Email:    {}", adminEmail);
            log.info("  Password: [SET VIA app.admin.password]");
            log.info("  CHANGE THIS IN PRODUCTION!");
            log.info("========================================");
        } else {
            log.info("Admin user already exists, skipping initialization.");
        }
    }
}
