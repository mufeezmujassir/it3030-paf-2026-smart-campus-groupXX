// src/main/java/com/smartcampus/operations/repository/MaintenanceRequestRepository.java
package com.smartcampus.operations.repository;

import com.smartcampus.operations.entity.MaintenanceRequest;
import com.smartcampus.operations.entity.MaintenanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, UUID> {
    Optional<MaintenanceRequest> findByBookingId(UUID bookingId);
    List<MaintenanceRequest> findByTechnicianId(UUID technicianId);
    List<MaintenanceRequest> findByTechnicianIdAndMaintenanceStatus(UUID technicianId, MaintenanceStatus status);
}