package com.smartcampus.operations.repository;

import com.smartcampus.operations.entity.ResourceImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ResourceImageRepository extends JpaRepository<ResourceImage, UUID> {
}
